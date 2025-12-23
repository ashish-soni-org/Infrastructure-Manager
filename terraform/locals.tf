locals {
  # --- Static Configuration ---
  # Hard-coded for now; will be moved to var.ui_manifest logic in the future
  instance_type = "t3.micro"
  ami = "ami-02b8269d5e85954ef"



  # Extract Unique VPCs
  vpcs = {
    for vpc in var.ui_manifest : vpc.vpc_name => {
      name = vpc.vpc_name
    }
  }

  # Extract Unique Subnets
  subnets = flatten([
    for vpc in var.ui_manifest : [
      for sn in vpc.subnets : {
        key      = "${vpc.vpc_name}-${sn.subnet_name}"
        vpc_name = vpc.vpc_name
        name     = sn.subnet_name
      }
    ]
  ])

  # Extract EC2 Instances
  ec2_instances = flatten([
    for vpc in var.ui_manifest : [
      for sn in vpc.subnets : [
        for res in sn.resources : [
          for inst in res.instances : {
            key         = "${vpc.vpc_name}-${sn.subnet_name}-${inst.name}"
            vpc_name    = vpc.vpc_name
            subnet_name = sn.subnet_name
            name        = inst.name
            services    = inst.services

            domain       = try(inst.domain, null)
            ssl_email    = try(inst.ssl_email, null)
            
            # TODO: GET FROM UI
            ami           = local.ami
            instance_type = local.instance_type

          } if res.type == "EC2"
        ]
      ]
    ]
  ])

  # Extract S3 Buckets
  s3_buckets = flatten([
    for vpc in var.ui_manifest : [
      for sn in vpc.subnets : [
        for res in sn.resources : [
          for inst in res.instances : {
            key  = "${vpc.vpc_name}-${sn.subnet_name}-${inst.name}"
            name = lower(inst.name) # S3 names must be lowercase
          } if res.type == "S3"
        ]
      ]
    ]
  ])

  # Extract ECR Repositories
  ecr_repositories = flatten([
    for vpc in var.ui_manifest : [
      for sn in vpc.subnets : [
        for res in sn.resources : [
          for inst in res.instances : {
            key  = "${vpc.vpc_name}-${sn.subnet_name}-${inst.name}"
            name = lower(inst.name) # ECR repo names are typically lowercase
          } if res.type == "ECR"
        ]
      ]
    ]
  ])
}