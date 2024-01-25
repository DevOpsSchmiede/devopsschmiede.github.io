---
title: "Go Dependencies in Private Repositories"
date: 2023-09-17T18:09:29+02:00
draft: false
authors:
  - fabian
categories:
  - go
tags:
  - go
  - git
  - repositories
summary: Have you ever thought about to store some of your code in private repository and use it as dependencies? You may noticed that this doesn’t work out of the box. In this article we will describe how you can achieve this.
---

As described in the teaser I recently asked myself how to do this because I wanted to store some middlewares for [Gin Gonic](https://gin-gonic.com/) centrally at work. It would have been possible to store them publicly because they don’t contain any company secrets. But some parts are some kind of specific regarding HTTP headers.

# How Go fetches dependencies

I assume that you add dependencies to your project using the `go get` command. If not, why? Do it! Anyway if you run `go get github.com/gin-gonic/gin@v1.9.1` for example Go uses Git under the hood. But the protocol which is in charge is HTTP. Which results in something like this `git clone --branch v1.9.1 https://github.com/gin-gonic/gin.git`. It’s impossible to tell Go to use SSH instead but there’s some kind of a “hack” to switch to SSH if necessary.

> We recommend to use Git with SSH

# Configure Go+Git to use private repositories

To use private repositories you always have to tell Go which domains or specifically repositories are private. To do this the `GOPRIVATE` env variable has to be defined. It can be set individually per terminal or centrally in your dotfiles (`.bashrc`, `.zshrc`, etc.). This is independent from the protocol you use with git.

The value of the `GOPRIVATE` variable can look like this.

```bash
export GOPRIVATE=github.com/BaldFabi/someprivaterepo,git.company.com
```

As you can see you can define a specific repository or domain if a Git server instance is entirely private.

Additionally to the env variable you have to provide some kind of credentials because Go+Git won’t ask you for some while fetching dependencies.

## HTTP

For HTTP you have to add a configuration in your `~/.netrc` config file.

```bash
machine git.company.com
	login your_username
	password a_private_token_which_you_have_issued_in_your_profile
```

## SSH

For SSH you can be much more precise regarding the repository.

Instead of the `~/.netrc` file you have to add some lines to `~/.gitconfig`. You can also use the `git config` command but I like to do it manually.

```bash
[url "git@git.company.com:"]
	insteadOf = https://git.company.com

[url "git@github.com:BaldFabi/someprivaterepo.git"]
	insteadOf = https://github.com/BaldFabi/someprivaterepo
```

As you may see git just makes a simple string replace and you can be specifically in case of a repository or generally regarding the domain.

# Conclusion

To use private repositories as dependencies in Go is possible but you need to configure multiple things. It’s cumbersome and I personally hope that in the future we have more direct control over Go instead of a mix between Go and git.
