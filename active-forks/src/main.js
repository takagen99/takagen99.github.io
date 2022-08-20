window.addEventListener('load', () => {
  initDT(); // Initialize the DatatTable and window.columnNames variables
  addDarkmodeWidget();

  Options.loadAndShow();

  Progress().hide();

  const repo = getRepoFromUrl();

  try {
    const token = localStorage.getItem('token');
    if (token) document.getElementById('token').value = token;
    else {
      const authToken = getQueryVariableFromUrl('authToken');
      if (authToken) {
        document.getElementById('token').value = authToken;
      }
    }
  } catch {}

  if (repo) {
    document.getElementById('q').value = repo;
    fetchData();
  }
});

document.getElementById('form').addEventListener('submit', (e) => {
  e.preventDefault();
  fetchData();
});

function addDarkmodeWidget() {
  new Darkmode({ label: '🌓' }).showWidget();
}

let running = false;

function fetchData() {
  if (running) {
    running = false;
    return;
  }
  Runner.start();

  hideMsg();

  const repo = document.getElementById('q').value;
  const re = /[-_\w]+\/[-_.\w]+/;

  const urlRepo = getRepoFromUrl();

  if (!urlRepo || urlRepo !== repo) {
    window.history.pushState('', '', `#${repo}`);
  }

  if (re.test(repo)) {
    (async function () {
      await fetchAndShow(repo);

      Runner.stop();
    })();
  } else {
    Runner.stop();
    showMsg(
      'Invalid GitHub repository! Format is &lt;username&gt;/&lt;repo&gt;',
      'danger'
    );
  }
}

function updateDT(data) {
  // Remove any alerts, if any:
  if ($('.alert')) $('.alert').remove();

  // Format dataset and redraw DataTable. Use second index for key name
  const forks = [];
  for (let fork of data) {
    fork.ownerName = `<a href="https://github.com/${fork.owner.login}">${fork.owner.login}</a>`;
    fork.name = `<a href="https://github.com/${fork.full_name}">${fork.name}</a>`;
    forks.push(fork);
  }
  const dataSet = forks.map((fork) =>
    window.columnNamesMap.map((colNM) => fork[colNM[1]])
  );
  window.forkTable.clear().rows.add(dataSet).draw();
}

function initDT() {
  // Create ordered Object with column name and mapped display name
  window.columnNamesMap = [
    // [ 'Repository', 'full_name' ],
    ['Owner', 'ownerName'], // custom key
    ['Name', 'name'],
    ['Branch', 'default_branch'],
    ['Stars', 'stargazers_count'],
    ['Forks', 'forks'],
    ['Open Issues', 'open_issues_count'],
    ['Size', 'size'],
    ['Last Push', 'pushed_at'],
    ['Diff Behind', 'diff_from_original'],
    ['Diff Ahead', 'diff_to_original'],
  ];

  // Sort by stars:
  const sortColName = 'Stars';
  const sortColumnIdx = window.columnNamesMap
    .map((pair) => pair[0])
    .indexOf(sortColName);

  // Use first index for readable column name
  // we use moment's fromNow() if we are rendering for `pushed_at`; better solution welcome
  window.forkTable = $('#forkTable').DataTable({
    columns: window.columnNamesMap.map((colNM) => {
      return {
        title: colNM[0],
        render: (data, type, _row) => {
          switch (colNM[1]) {
            case 'pushed_at':
              return type === 'display' ? moment(data).fromNow() : data;

            case 'diff_from_original':
            case 'diff_to_original':
              return type === 'display' ? data : data.substr(4, 4);

            default:
              return data;
          }
        },
      };
    }),
    columnDefs: [
      { className: 'dt-right', targets: [3, 4, 7, 8, 9] }, // numbers
      { className: 'dt-center', targets: [2, 5, 6] }, // numbers
      { width: '120px', targets: 7 }, // date
    ],
    order: [[sortColumnIdx, 'desc']],
    createdRow: function (row, _, index) {
      $('[data-toggle=popover]', row).popover();
      if (index === 0) row.classList.add('original-repo');
    },
  });
}

async function fetchAndShow(repo) {
  repo = repo.replace('https://github.com/', '');
  repo = repo.replace('http://github.com/', '');
  repo = repo.replace(/\.git$/, '');

  const token = document.getElementById('token').value;
  localStorage.setItem('token', token);
  const api = Api(token);

  const data = [];
  try {
    const maxRecords = Options.getAndSave().maxRecords;

    const singleLimiter = (fork) => ({
      full_name: fork.full_name,
      name: fork.name,
      default_branch: fork.default_branch,
      stargazers_count: fork.stargazers_count,
      forks: fork.forks,
      open_issues_count: fork.open_issues_count,
      size: fork.size,
      pushed_at: fork.pushed_at,
      owner: {
        login: fork.owner.login,
      },
    });

    const multiLimiter = (data) => data.map(singleLimiter);

    const originalRepo = await api.fetch(
      `https://api.github.com/repos/${repo}`,
      singleLimiter
    );
    originalRepo.diff_from_original = originalRepo.diff_to_original = '0';
    const originalBranch = originalRepo.default_branch;
    data.push(originalRepo);

    let page = 1;
    while (data.length - 1 < maxRecords) {
      const url = `https://api.github.com/repos/${repo}/forks?sort=stargazers&per_page=${maxRecords}&page=${page}`;
      const someData = await api.fetch(url, multiLimiter);

      if (someData.length === 0) break;
      data.push(...someData);
      ++page;
    }

    await updateData(repo, originalBranch, data.slice(1), api);
  } catch (error) {
    console.error(error);
  }

  try {
    updateDT(data);
  } catch (error) {
    console.error(error);
  }
}

function hideMsg() {
  document.getElementById('data-body').style.display = 'none';
}

function showMsg(msg, type) {
  let alert_type = 'alert-info';

  if (type === 'danger') {
    alert_type = 'alert-danger';
  }

  document.getElementById('footer').innerHTML = '';

  document.getElementById('data-body').style.display = 'block';
  document.getElementById('data-body').innerHTML = `
        <div class="alert ${alert_type} alert-dismissible fade show" role="alert">
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
            ${msg}
        </div>
    `;
}

function getRepoFromUrl() {
  const urlRepo = location.hash && location.hash.slice(1);

  return urlRepo && decodeURIComponent(urlRepo);
}

function getQueryVariableFromUrl(variable) {
  let queryVarArray = window.location.search.substring(1).split('&');
  for (let queryVar of queryVarArray) {
    let kvp = queryVar.split('=');
    if (kvp[0] == variable) return kvp[1];
  }
  return null;
}

async function updateData(repo, originalBranch, forks, api) {
  forks.forEach(
    (fork) => (fork.diff_from_original = fork.diff_to_original = '')
  );

  let index = 1;
  const quota = Quota(api);
  const progress = Progress(forks.length);
  progress.show();

  const options = Options.getAndSave();
  const similarChecker = SimilarChecker(options);

  try {
    for (let fork of forks) {
      progress.update(index);
      if (!running) break;

      const updated = similarChecker.apply(fork);

      if (!updated) {
        await fetchMore(repo, originalBranch, fork, api);
        similarChecker.cache(fork);
      }
      quota.update();
      ++index;
    }
  } finally {
    progress.hide();

    await api.refreshLimits();
    quota.update();
  }
}

async function fetchMore(repo, originalBranch, fork, api) {
  return Promise.all([
    fetchMoreDir(repo, originalBranch, fork, true, api),
    fetchMoreDir(repo, originalBranch, fork, false, api),
  ]);
}

async function fetchMoreDir(repo, originalBranch, fork, fromOriginal, api) {
  const url = fromOriginal
    ? `https://api.github.com/repos/${repo}/compare/${fork.owner.login}:${fork.default_branch}...${originalBranch}`
    : `https://api.github.com/repos/${repo}/compare/${originalBranch}...${fork.owner.login}:${fork.default_branch}`;

  const limiter = (data) => ({
    commits: data.commits.map((c) => ({
      sha: c.sha.substr(0, 6),
      commit: {
        author: {
          date: c.commit.author.date,
        },
        message: c.commit.message,
      },
      author: {
        login: c.author ? c.author.login : undefined,
      },
    })),
  });
  const data = await api.fetch(url, limiter);

  if (data !== null) {
    if (fromOriginal) fork.diff_from_original = printInfo('-', data, fork);
    else fork.diff_to_original = printInfo('+', data, fork);
  }
}

function printInfo(sep, data, fork) {
  const length = data.commits.length;
  if (length === 0) return '0';

  const details =
    '<pre>' +
    data.commits
      .map((c) => {
        c.author_date = c.commit.author.date.replace('Z', '').replace('T', ' ');
        c.author_login = c.author && c.author.login ? c.author.login : '-';
        const sha = c.sha.substr(0, 6);
        c.link = `<a href="https://github.com/${fork.owner.login}/${fork.name}/commit/${sha}">${sha}</a>`;
        return c;
      })
      .map(
        (c) =>
          `${c.link} ${c.author_date.substr(0, 10)} ${c.author_login} - ${
            c.commit.message
          }`
      )
      .map((s) => s.replace(/[\n\r]/g, ' ').substr(0, 150))
      .join('\n')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;') +
    '</pre>';

  const sort = `<!--${('000' + length).substr(-4)}-->`;
  return `${sort}<a tabindex="0" class="btn btn-sm btn-outline-secondary" data-toggle="popover" data-trigger="focus" data-html="true" data-placement="bottom" title="Commits" data-content="${details}">${sep}${length}</a>`;
}

function Progress(max) {
  const $progress = $('.progress');
  const $bar = $('.progress-bar');

  function show() {
    $progress.show();
  }

  function hide() {
    $progress.hide();
  }

  function update(count) {
    const val = Math.round((count / max) * 100) + '%';
    $bar.width(val);
    $bar.text(`${count} / ${max}`);
  }

  return { show, hide, update };
}

function Quota(api) {
  const $quota = $('.quota');

  function update() {
    const rate = api.getLimits();
    const reset = moment(rate.reset).fromNow();
    $quota.html(
      `Quota: left ${rate.remaining} / ${rate.limit}<br/>Reset ${reset}`
    );
  }

  return { update };
}

function Api(token) {
  const config = token
    ? {
        headers: {
          authorization: 'token ' + token,
        },
      }
    : undefined;

  const rate = {
    remaining: '?',
    limit: '?',
    reset: new Date(),
  };

  const cache = ApiCache();

  async function get(url, fnResponseLimiter) {
    try {
      const { cached, newConfig } = cache.get(url, config);
      const response = await fetch(url, newConfig);
      if (response.status === 304) return cached.data;
      if (response.status === 404) return null;
      if (!response.ok) throw Error(response.statusText);

      updateRate(response);

      const data = await response.json();
      const limitedData = fnResponseLimiter(data);

      cache.add(url, limitedData, response);

      return limitedData;
    } catch (error) {
      const msg =
        error.toString().indexOf('Forbidden') >= 0
          ? 'Error: API Rate Limit Exceeded'
          : error;
      showMsg(`${msg}. Additional info in console`, 'danger');

      throw error;
    }
  }

  function getLimits() {
    return rate;
  }

  async function refreshLimits() {
    const url = 'https://api.github.com/rate_limit';
    const response = await fetch(url, config);
    if (response.ok) updateRate(response);
  }

  function updateRate(response) {
    rate.limit = response.headers.get('x-ratelimit-limit');
    rate.remaining = response.headers.get('x-ratelimit-remaining');
    rate.reset = new Date(
      1000 * parseInt(response.headers.get('x-ratelimit-reset'))
    );
  }

  return { fetch: get, getLimits, refreshLimits };
}

function ApiCache() {
  const map = new Map();
  const STORAGE = sessionStorage;

  function get(url, config) {
    const key = url.toLowerCase();
    const newConfig = JSON.parse(JSON.stringify(config));

    let cachedString = map.get(key);
    try {
      if (!cachedString) {
        cachedString = STORAGE.getItem(key);
        if (cachedString) map.set(key, cachedString);
      }
    } catch {}

    const cached = JSON.parse(cachedString);
    if (cached) {
      newConfig.headers['if-none-match'] = cached.etag;
      cached.date = new Date();
    }

    return { cached, newConfig };
  }

  function add(url, limitedData, response) {
    const key = url.toLowerCase();
    const val = JSON.stringify({
      etag: response.headers.get('etag'),
      date: new Date(),
      data: limitedData,
    });

    map.set(key, val);
    try {
      STORAGE.setItem(key, val);
    } catch (err) {}
  }

  return { get, add };
}

const Runner = {
  start: function () {
    running = true;
    $('#find .find-label').text('Stop');
    $('#find #spinner').addClass('d-inline-block');
  },
  stop: function () {
    running = false;
    $('#find .find-label').text('Find');
    $('#find #spinner').removeClass('d-inline-block');
  },
};

const Options = {
  loadAndShow: function () {
    $('#options')
      .on('show.bs.collapse', () =>
        $('.options-button').addClass('options-button--expanded')
      )
      .on('hide.bs.collapse', () =>
        $('.options-button').removeClass('options-button--expanded')
      );

    try {
      const savedString = localStorage.getItem('options');
      const saved = JSON.parse(savedString) || {
        sameSize: true,
        samePushDate: true,
        maxRecords: 100,
      };

      $('#sameSize').attr('checked', saved.sameSize);
      $('#samePushDate').attr('checked', saved.samePushDate);
      $('#maxRecords').val(saved.maxRecords);
    } catch {}
  },

  getAndSave: function () {
    const sameSize = $('#sameSize').is(':checked');
    const samePushDate = $('#samePushDate').is(':checked');
    const maxRecords = $('#maxRecords').val();

    const val = { sameSize, samePushDate, maxRecords };
    try {
      localStorage.setItem('options', JSON.stringify(val));
    } catch {}
    return val;
  },
};

function SimilarChecker(options) {
  const similarForks = new Map();

  function getKey(fork) {
    let key = '';
    if (options.sameSize) key += fork.size + '_';
    if (options.samePushDate) key += fork.pushed_at + '_';
    return key;
  }

  function apply(fork) {
    const key = getKey(fork);
    if (key.length > 0) {
      const similarFork = similarForks.get(key);
      if (similarFork) {
        fork.diff_from_original = similarFork.diff_from_original;
        fork.diff_to_original = similarFork.diff_to_original;
        return true;
      }
    }

    return false;
  }

  function cache(fork) {
    const key = getKey(fork);
    if (key.length > 0) {
      similarForks.set(key, {
        diff_from_original: fork.diff_from_original,
        diff_to_original: fork.diff_to_original,
      });
    }
  }

  return { apply, cache };
}