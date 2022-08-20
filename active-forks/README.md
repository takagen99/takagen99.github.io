# Active Forks

> Find the active github forks of a project

This project allows you to find the most active forks of a repository.

Extended Features:
* Works after providing a **personal GitHub token**. It is used only to increase the limits to query to API. The token is stored in Local Storage only, not sent anywhere except for the GitHub API. If the token is not stored in Local Storage, it can be provided via URL query string parameter `authToken`.
* Include the **original repository** in the list, marked in bold.
* After expanding **Options**, it is possible to increase the **maximum amount of forks** to retrieve and to utilize some kind of caching.
* Retrieve **commits of each fork** and show the differences.
* Click on box in the **Diff** column to see the commits.

Original Fork
[Find Active Fork](https://ridvanaltun.github.io/active-forks)


## Optimizations

Because this version retrieves commits from every fork which is slow and uses your quota (it resets every hour, don't worry), I added two options for caching results:
* **Same size** - if a fork has the same size as a fork that has already been read, it is assumed to be the same and contain the same commits.
* **Same Push Date** - same but looks at the Last Push date.
If both are selected, both conditions have to be satisfied at the same time.
If the condition is satisfied, commits for the second fork are not retrieved but assumed to be the same as in the first fork.

## As Bookmarklet

If you would like to use this tool as a bookmarklet,
you can do so by saving the following javascript code as the bookmarklet.
Since Github doesn't allow javascript in its markdown, you can add it manually.
Hit `Ctrl+D` to create a new bookmark and paste the javascript below into the URL
or "Location" entry (you may have to click "More" to see the URL field).
Any time you're on a Github repo you can click the bookmarklet
and it'll bring up the Active Forks of that repo.

```javascript
javascript:var title=document.title;if(title){  thing=title.split(':');var newPage = 'https://ridvanaltun.github.io/active-forks#'+thing[0];open(newPage ,'targetname')}
```

## As Extension

You can use this tool with the web extension (for Firefox, Chrome or Edge).

[Check Extension Page!](https://github.com/ridvanaltun/active-forks-extension)
