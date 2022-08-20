window.addEventListener('load', () => {
  initDT(); // Initialize the DatatTable and window.columnNames variables

  const repo = getRepoFromUrl();

  if (repo) {
    document.getElementById('q').value = repo;
    fetchData();
  }
});

document.getElementById('form').addEventListener('submit', e => {
  e.preventDefault();
  fetchData();
});

function fetchData() {
  const repo = document.getElementById('q').value;
  const re = /[-_\w]+\/[-_.\w]+/;

  const urlRepo = getRepoFromUrl();

  if (!urlRepo || urlRepo !== repo) {
    window.history.pushState('', '', `#${repo}`);
  }

  if (re.test(repo)) {
    fetchAndShow(repo);
  } else {
    showMsg(
      'Invalid GitHub repository! Format is &lt;username&gt;/&lt;repo&gt;',
      'danger'
    );
  }
}

function updateDT(data, table) {
  // Remove any alerts, if any:
  if ($('.alert')) $('.alert').remove();

  // Format dataset and redraw DataTable. Use second index for key name
  const forks = [];
  if (!Array.isArray(data)) {
    data = [data]
  }
  for (let fork of data) {
    fork.repository = `<a href="https://github.com/${fork.full_name}">${fork.full_name}</a>`;
    fork.ownerName = fork.owner.login;
    let push = moment(fork.pushed_at);
    let create = moment(fork.created_at);
    let update = moment(fork.updated_at);
    fork.changed = (push.diff(create, 'minutes') > 0 || update.diff(create, 'minutes') > 0) ? '+' : '-';
    forks.push(fork);
  }
  const dataSet = forks.map(fork =>
    window.columnNamesMap.map(colNM => fork[colNM[1]])
  );
  table
    .clear()
    .rows.add(dataSet)
    .draw();
}

function initDT() {
  // Create ordered Object with column name and mapped display name
  window.columnNamesMap = [
    ['Repository', 'repository'], // custom key
    ['Branch', 'default_branch'],
    ['Stars', 'stargazers_count'],
    ['Forks', 'forks'],
    ['Issues', 'open_issues_count'],
    ['Watched', 'watchers'],
    // ['Size', 'size'],
    ['Pushed', 'pushed_at'],
    ['Updated', 'updated_at'],
    ['Created', 'created_at'],
    ['Edited', 'changed'],
  ];

  // Sort by stars:
  const sortColName = 'Stars';
  const sortColumnIdx = window.columnNamesMap
    .map(pair => pair[0])
    .indexOf(sortColName);

  let colMapper = window.columnNamesMap.map(colNM => {
    return {
      title: colNM[0],
      render:
        colNM[1] === 'pushed_at' || colNM[1] === 'created_at' || colNM[1] === 'updated_at'
          ? (data, type, _row) => {
              if (type === 'display') {
                return moment(data).format('YYYY-MM-DD HH:mm');
              }
              return data;
            }
          : null,
    };
  });

  // Use first index for readable column name
  // we use moment's fromNow() if we are rendering for `pushed_at`; better solution welcome
  window.forkTable = $('#forkTable').DataTable({
    columns: colMapper,
    order: [[sortColumnIdx, 'desc']],
  });

  window.originTable = $('#originTable').DataTable({
    paging: false,
    searching: false,
    ordering: false,
    info: false,
    columns: colMapper,
  });
}

function fetchAndShow(repo) {
  repo = repo.replace('https://github.com/', '');
  repo = repo.replace('http://github.com/', '');
  repo = repo.replace(/\.git$/, '');

  fetch(
    `https://api.github.com/repos/${repo}/forks?sort=stargazers&per_page=100`
  )
    .then(response => {
      if (!response.ok) throw Error(response.statusText);
      return response.json();
    })
    .then(data => {
      console.log(data);
      updateDT(data, window.forkTable);

      return fetch(
        `https://api.github.com/repos/${repo}`
      )
    })
    .then(response => {
      if (!response.ok) throw Error(response.statusText);
      return response.json();
    })
    .then(data => {
      console.log(data);
      updateDT(data, window.originTable);
    })
    .catch(error => {
      const msg =
        error.toString().indexOf('Forbidden') >= 0
          ? 'Error: API Rate Limit Exceeded'
          : error;
      showMsg(`${msg}. Additional info in console`, 'danger');
      console.error(error);
    });
}

function showMsg(msg, type) {
  let alert_type = 'alert-info';

  if (type === 'danger') {
    alert_type = 'alert-danger';
  }

  document.getElementById('footer').innerHTML = '';

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