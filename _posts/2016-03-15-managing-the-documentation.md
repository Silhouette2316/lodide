---
layout: page
title: "Managing the Documentation"
category: dev
date: 2016-03-15 13:23:55
---

The documentation of LodIDE is kept in the `gh-pages` branch of the git repo. 
Thanks to GitHub pages it is accessible at 
[http://edulod.github.io/lodide/](http://edulod.github.io/lodide/).

### Jekyll

The documentation site uses [Jekyll](http://jekyllrb.com/) and is based on 
[jekyll-docs-template](https://github.com/bruth/jekyll-docs-template).

To create a new page you can simply add a respective Markdown file in the 
`_posts` directory or use the supplied script:

```bash
ruby bin/jekyll-page "Some Page Title" ref
```

