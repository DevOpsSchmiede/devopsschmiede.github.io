---
title: "Quicky Kubernetes Orphaned Pod"
date: 2023-01-31T20:28:34+01:00
draft: false
authors:
  - fabian
categories:
  - quicky
  - kubernetes
tags:
  - quicky
  - kubernetes
summary: Did or do you encounter the problem that one or more Kubernetes nodes tell you that and orphaned pod was found? Luckily we have a solution for you. It took us a while to figure out what the problem was.
---

During/After an upgrade of one of our clusters the following log line was spammed into our log files.

```bash
Jan 16 08:30:12 node1 kubelet[66879]: E0116 08:30:12.044483   66879 kubelet_volumes.go:245] "There were many similar errors. Turn up verbosity to see them." err="orphaned pod \"84344a7e-8003-462a-9321-a3f6c45e530f\" found, but error occurred when trying to remove the volumes dir: not a directory" numErrs=4
```

Every node had the same problem but with different pods. It took us some time to figure out what actually the problem was. We learned that Kubernetes has some volumes that shouldn’t exist. In the path `/var/lib/kubelet/pods` you can find a couple of directories and also one with the name mentioned in the log line. You can freely delete this folder and the log lines regarding this pod will vanish. If you look again in the log the next orphaned pod directory presumably will be listed (shown in the `numErrs` attribute at the end of the log line). Delete every folder mentioned in the log after you deleted one.
