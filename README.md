# www.devops-schmiede.de

This repository is the source of [www.devops-schmiede.de](https://www.devops-schmiede.de). The whole site is static it uses [hugo](https://gohugo.io/) as its generator.

## Create new post

To create a new post run the following command in the root of this repository.

```bash
hugo new posts/[title-of-your-post]/index.md --kind post
```

It will use the archetype [post](/archetypes/post.md) as its base and generates a new post within [en/posts/](content/en/posts/).
If you would like to only create a german post, move the generated directory to [de/posts/](content/en/posts/) or copy it if you would like to translate it (later).
