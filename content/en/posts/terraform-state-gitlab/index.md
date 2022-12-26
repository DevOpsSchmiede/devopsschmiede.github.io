---
title: "Store your Terraform state beside your code in GitLab"
date: 2022-12-26T00:07:58+01:00
draft: false
authors:
  - fabian
categories:
  - Terraform
tags:
  - terraform
  - gitlab
  - ci/cd
  - state
summary: In this article we will show you how you can store your Terraform state within GitLab beside your code. We also explain how to use this method when using GitLab's CI/CD.
---

If you execute your Terraform plan from different places or do not work alone on it, it’s mandatory to store the state of your resources on a central location. Introduced in version 13.0 of GitLab it’s now possible to store it beside your code.

You should definitely read the [Terraform docs](https://developer.hashicorp.com/terraform/language/state) regarding the state if you yet don’t know what purpose the state serves. In the docs there is one important sentence

> This state is stored by default in a local file named "terraform.tfstate", but it can also be stored remotely, which works better in a team environment.

and to be clear, storing the state remotely will not only work better but saves you from some huge impacts and issues that can happen. Especially if we’re talking about constantly overriding settings of your resources. Think about your colleague who is changing some stuff simultaneously. Thats not something you really would like to happen.

## GitLab

As already mentioned GitLab introduced the feature of storing the Terraform state beside the code in version 13.0 in all of their tiers. Which means you can use it in every GitLab instance you’re in.

The only thing that has to be enabled is the **Operations** option under Settings > General > Visibility, project features, permissions of your repository.

## Terraform

To store the state of Terraform remotely you have to define a backend. In combination with GitLab it has to be a `http`backend.

```hcl
terraform {
  # ...

  backend "http" {
  }
]
```

As mentioned in the [docs](https://developer.hashicorp.com/terraform/language/settings/backends/http) only one option is mandatory for Terraform which is `address`. But we have to define the following options too:

- address: The address to store the state
- username: The username which has write access for the Terraform state
- password: The corresponding password to the username
- lock_method: The lock method differs from the default in GitLab
- unlock_method: The same applies to the unlock method
- lock_address: The lock address to lock the remotely stored state
- unlock_address: The unlock address to unlock the remotely stored state

It’s not necessary to use the lock and unlock options but I recommend to use them otherwise the state is just stored remotely but it still can be altered while another apply is running.

### Values

Let’s talk about the values of these options. For the username and password we could use an access token of your user (Preferences > Access Tokens). But if you think about to run `terraform plan` and `terraform apply` centrally, e.g. in GitLab CI/CD, you would leak your credentials to everyone who has access to it. Because of that, you should always have this rule in mind: if you run these commands locally, use an access token of your user, if you run it centrally, create an repository token (Settings > Access Tokens).

#### username and password

For this article we will use a repository access token. So go to Settings > Access Tokens of your repository and create one like in the following screen

![add a project access token](images/repository_access_token.png)

You can choose freely regarding the name but it needs the Maintainer role and the api scope. I actually tested any other combination regarding the role but Maintainer seems necessary. If you need or want to, you can of course define an expiration date. After doing so, you get the access token.

![access token](images/repository_access_token_2.png)

Save it somewhere because that’s the only time you will see it.

After these step you have your username `terraform` and password `glpat-67jCDn-XrfMzqEo-EEHv`.

#### locking and unlocking

The GitLab documentation shows us quite good what the values should be for the remaining ones. But you need the id of your project. You can find it directly below the headline of your project.

![project id](images/project_id.png)

With this information you can finally fill out the remaining options:

- address: https://gitlab.com/api/v4/projects/[YOUR_PROJECT_ID]/terraform/state/[THE_NAME_OF_YOUR_TF_STATE]
- lock_method: POST
- unlock_method: DELETE
- lock_address/unlock_address: https://gitlab.com/api/v4/projects/[YOUR_PROJECT_ID]/terraform/state/[THE_NAME_OF_YOUR_TF_STATE]/lock

As you can see in the values, you can freely choose the name of your state file and you should! Why you should? You can store multiple states in one repository and if you do, because you manage some resources in a mono repository for example, you don’t want some kind of collisions.

## GitLab CI/CD

You might have already assumed that we will use GitLabs CI/CD because of the repository access token we created earlier. To set the described options you can use the cli arguments as mentioned in the [documentation](https://docs.gitlab.com/ee/user/infrastructure/iac/terraform_state.html#change-the-backend) but that’s a little bit cumbersome. To avoid this we will simple use environment variables that can be set using the repository settings (Settings > CD/CD > Variables). These are the corresponding environment variable names to the above listed Terraform options:

- TF_HTTP_ADDRESS: address
- TF_HTTP_USERNAME: username
- TF_HTTP_PASSWORD: password
- TF_HTTP_LOCK_ADDRESS: lock_address
- TF_HTTP_UNLOCK_ADDRESS: unlock_address
- TF_HTTP_LOCK_METHOD: lock_method
- TF_HTTP_UNLOCK_METHOD: unlock_method

We will now combine these environment variables with our previous mentioned values.

| environment variable   | value                                                                           |
| ---------------------- | ------------------------------------------------------------------------------- |
| TF_HTTP_ADDRESS        | $CI_API_V4_URL/projects/$CI_PROJECT_ID/terraform/state/$CI_COMMIT_REF_NAME      |
| TF_HTTP_USERNAME       | terraform                                                                       |
| TF_HTTP_PASSWORD       | glpat-67jCDn-XrfMzqEo-EEHv                                                      |
| TF_HTTP_LOCK_ADDRESS   | $CI_API_V4_URL/projects/$CI_PROJECT_ID/terraform/state/$CI_COMMIT_REF_NAME/lock |
| TF_HTTP_UNLOCK_ADDRESS | $TF_HTTP_LOCK_ADDRESS                                                           |
| TF_HTTP_LOCK_METHOD    | POST                                                                            |
| TF_HTTP_UNLOCK_METHOD  | DELETE                                                                          |

As you can see we use some [predefined variables](https://docs.gitlab.com/ee/ci/variables/predefined_variables.html). Especially for the name of the state we’re using the name of the branch we’re in. Replace it with whatever you like. To test everything we now need some resources we can manage. To achieve this we will use the [null provider](https://registry.terraform.io/providers/hashicorp/null/latest/docs). With the null provider we can create resources that are only exist within Terraform and its state.

```hcl
terraform {
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "3.1.1"
    }
  }

  backend "http" {
  }
}

provider "null" {}

resource "null_resource" "test_resource" {
  triggers = {
    always = timestamp()
  }

  provisioner "local-exec" {
    command = "echo hello world"
  }
}
```

As you can see, we tell Terraform that we want to use the null provider and a http backend. The `null_resource`, named `test_resource`, has a trigger that will force a recreation everytime `apply` runs. That’s actually not necessary for our example but thanks to that trigger the state will everytime be altered if we run `apply`.

### Pipeline configuration

The only thing that’s left is our pipeline configuration for GitLab.

```yaml
stages:
  - plan
  - apply

terraform plan:
  stage: plan
  image:
    name: hashicorp/terraform:latest # you should pin the image version
    entrypoint: [""]
  before_script:
    - terraform init
  script:
    - terraform plan -out plan.out
  artifacts:
    paths:
      - .terraform.lock.hcl
      - plan.out
    expire_in: 1 day

terraform apply:
  stage: apply
  image:
    name: hashicorp/terraform:latest # you should pin the image version
    entrypoint: [""]
  before_script:
    - terraform init
  script:
    - terraform apply plan.out
  needs:
    - job: terraform plan
      artifacts: true
```

We define two stages for our pipeline. Each stage corresponds with the Terraform subcommands. For our tasks we use the official HashiCorp Terraform image from the DockerHub. There’s actually a [GitLab Terraform image](https://gitlab.com/gitlab-org/terraform-images) which is especially created for being used in the GitLab pipeline but in the end I had more problem using this than using the official image. For each step we have to override the entrypoint (which is the command `terraform`) and run `terraform init` to download the providers.

The rest, `terraform plan` and `terraform apply`, is being used the same way you should already know. For the `apply` step we have to bring the two artifacts `.terraform.lock.hcl` and `plan.out` from the `plan` step in.

The result after running the pipeline looks like the following.

`terraform plan`

```bash
hecking out e91869f0 as master...
Removing .terraform.lock.hcl
Removing .terraform/
Removing plan.out
Skipping Git submodules setup
Executing "step_script" stage of the job script 00:03
Using docker image sha256:f17f49c31a051e96c9831cf926703c71882cf4d28f410d4b8dd1f30c09638967 for hashicorp/terraform:latest with digest hashicorp/terraform@sha256:d97b8378e608a994196302e1e4b386b94d229de1bc7c514a3169d66c53b4e13e ...
$ terraform init
Initializing the backend...
Successfully configured the backend "http"! Terraform will automatically
use this backend unless the backend configuration changes.
Initializing provider plugins...
- Finding hashicorp/null versions matching "3.1.1"...
- Installing hashicorp/null v3.1.1...
- Installed hashicorp/null v3.1.1 (signed by HashiCorp)
Terraform has created a lock file .terraform.lock.hcl to record the provider
selections it made above. Include this file in your version control repository
so that Terraform can guarantee to make the same selections by default when
you run "terraform init" in the future.
Terraform has been successfully initialized!
You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.
If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
$ terraform plan -out plan.out
null_resource.test_resource: Refreshing state... [id=819803621259150673]
Terraform used the selected providers to generate the following execution
plan. Resource actions are indicated with the following symbols:
-/+ destroy and then create replacement
Terraform will perform the following actions:
  # null_resource.test_resource must be replaced
-/+ resource "null_resource" "test_resource" {
      ~ id       = "819803621259150673" -> (known after apply)
      ~ triggers = {
          - "always" = "2022-11-02T14:30:45Z"
        } -> (known after apply) # forces replacement
    }
Plan: 1 to add, 0 to change, 1 to destroy.
─────────────────────────────────────────────────────────────────────────────
Saved the plan to: plan.out
To perform exactly these actions, run the following command to apply:
    terraform apply "plan.out"
Uploading artifacts for successful job 00:00
Uploading artifacts...
.terraform.lock.hcl: found 1 matching files and directories
plan.out: found 1 matching files and directories
Uploading artifacts as "archive" to coordinator... 201 Created  id=64044 responseStatus=201 Created token=dzsBb7fs
Cleaning up project directory and file based variables 00:01
Job succeeded
```

`terraform apply`

```bash
Fetching changes with git depth set to 20...
Initialized empty Git repository in /builds/temp/XXX/.git/
Created fresh repository.
Checking out e91869f0 as master...
Skipping Git submodules setup
Downloading artifacts 00:00
Downloading artifacts for terraform plan (64044)...
Downloading artifacts from coordinator... ok        id=64044 responseStatus=200 OK token=kvysajt5
Executing "step_script" stage of the job script 00:02
Using docker image sha256:f17f49c31a051e96c9831cf926703c71882cf4d28f410d4b8dd1f30c09638967 for hashicorp/terraform:latest with digest hashicorp/terraform@sha256:d97b8378e608a994196302e1e4b386b94d229de1bc7c514a3169d66c53b4e13e ...
$ terraform init
Initializing the backend...
Successfully configured the backend "http"! Terraform will automatically
use this backend unless the backend configuration changes.
Initializing provider plugins...
- Reusing previous version of hashicorp/null from the dependency lock file
- Installing hashicorp/null v3.1.1...
- Installed hashicorp/null v3.1.1 (signed by HashiCorp)
Terraform has been successfully initialized!
You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.
If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
$ terraform apply plan.out
null_resource.test_resource: Destroying... [id=819803621259150673]
null_resource.test_resource: Destruction complete after 0s
null_resource.test_resource: Creating...
null_resource.test_resource: Provisioning with 'local-exec'...
null_resource.test_resource (local-exec): Executing: ["/bin/sh" "-c" "echo hello world"]
null_resource.test_resource (local-exec): hello world
null_resource.test: Creation complete after 0s [id=8349892974687737348]
Apply complete! Resources: 1 added, 0 changed, 1 destroyed.
Cleaning up project directory and file based variables 00:01
Job succeeded
```

![state in gitlab](images/state_in_gitlab.png)

You can view all stored states in your repository if you open Infrastructure > Terraform.

## A short summary

Thanks to GitLab we can now store the states of our Terraform plans centrally and we don’t need to additionally run, use or pay for a s3 storage. You and your colleagues can now work together on your infrastructure without interfering with each other and eventually (in the worst case) destroy your resources that are managed through Terraform.
