locals {
  # ---------------------------------------------------------------------------
  # Static configuration (temporary; UI-driven later)
  # ---------------------------------------------------------------------------
  instance_type = "t3.micro"
  ami           = "ami-02b8269d5e85954ef"

  # ---------------------------------------------------------------------------
  # STEP 1: Group manifest by VPC name (event-sourced → state-based)
  # ---------------------------------------------------------------------------
  vpc_events = {
    for vpc in var.ui_manifest :
    vpc.vpc_name => vpc...
  }

  # ---------------------------------------------------------------------------
  # STEP 2: Normalize VPCs (unique by name)
  # ---------------------------------------------------------------------------
  vpcs = {
    for vpc_name, events in local.vpc_events :
    vpc_name => {
      name = vpc_name
    }
  }

  # ---------------------------------------------------------------------------
  # STEP 3: Normalize Subnets (unique per VPC + subnet)
  # ---------------------------------------------------------------------------
  subnets_grouped = {
    for item in flatten([
      for vpc_name, events in local.vpc_events : [
        for e in events : [
          for sn in e.subnets : {
            key      = "${vpc_name}-${sn.subnet_name}"
            vpc_name = vpc_name
            name     = sn.subnet_name
          }
        ]
      ]
    ]) : item.key => item...
  }

  subnets = {
    for k, items in local.subnets_grouped :
    k => items[length(items) - 1]
  }


  # ---------------------------------------------------------------------------
  # STEP 4: Normalize EC2 instances (unique per permanent key)
  # ---------------------------------------------------------------------------
  ec2_instances = flatten([
    for vpc_name, events in local.vpc_events : [
      for sn in flatten([
        for e in events : e.subnets
      ]) : [
        for res in sn.resources : [
          for inst in res.instances : {
            key         = "${vpc_name}-${sn.subnet_name}-${inst.name}"
            vpc_name    = vpc_name
            subnet_name = sn.subnet_name
            name        = inst.name
            services    = inst.services

            domain    = try(inst.domain, null)
            ssl_email = try(inst.ssl_email, null)

            ami           = local.ami
            instance_type = local.instance_type
          } if res.type == "EC2"
        ]
      ]
    ]
  ])

  # ---------------------------------------------------------------------------
  # STEP 5: Normalize S3 buckets (unique by key)
  # ---------------------------------------------------------------------------
  s3_buckets_grouped = {
    for item in flatten([
      for vpc_name, events in local.vpc_events : [
        for e in events : [
          for sn in e.subnets : [
            for res in sn.resources : [
              for inst in res.instances : {
                key  = "${vpc_name}-${sn.subnet_name}-${inst.name}"
                name = lower(inst.name)
              } if res.type == "S3"
            ]
          ]
        ]
      ]
    ]) : item.key => item...
  }

  s3_buckets = {
    for k, items in local.s3_buckets_grouped :
    k => items[length(items) - 1]
  }

  # ---------------------------------------------------------------------------
  # STEP 6: Normalize ECR repositories (unique by key)
  # ---------------------------------------------------------------------------
  ecr_repositories = flatten([
    for vpc_name, events in local.vpc_events : [
      for sn in flatten([
        for e in events : e.subnets
      ]) : [
        for res in sn.resources : [
          for inst in res.instances : {
            key  = "${vpc_name}-${sn.subnet_name}-${inst.name}"
            name = lower(inst.name)
          } if res.type == "ECR"
        ]
      ]
    ]
  ])
}
