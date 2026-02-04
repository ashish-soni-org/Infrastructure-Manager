# --------------------------------------------------------------------------- 
# LOCALS & MANIFEST PARSING
# ---------------------------------------------------------------------------

locals {
  # Base Network CIDR for the entire infrastructure
  base_cidr = "10.0.0.0/8"

  # Parse the lists from the variable Object
  vpcs_raw       = try(var.ui_manifest.vpcs, [])
  standalone_raw = try(var.ui_manifest.standalone, [])

  # 1. Normalize VPCs
  vpcs = {
    for idx, vpc in local.vpcs_raw : 
    vpc.vpc_name => {
      name       = vpc.vpc_name
      cidr_block = cidrsubnet(local.base_cidr, 8, idx) # e.g., 10.0.0.0/16, 10.1.0.0/16
    }
  }

  # 2. Normalize Subnets
  subnets_flat = flatten([
    for vpc_idx, vpc in local.vpcs_raw : [
      for sn_idx, subnet in vpc.subnets : {
        key         = "${vpc.vpc_name}-${subnet.subnet_name}"
        vpc_name    = vpc.vpc_name
        name        = subnet.subnet_name
        # VPC: 10.{vpc_idx}.0.0/16 -> Subnet: 10.{vpc_idx}.{sn_idx}.0/24
        cidr_block  = cidrsubnet(cidrsubnet(local.base_cidr, 8, vpc_idx), 8, sn_idx)
        resources   = subnet.resources
      }
    ]
  ])
  subnets = { for item in local.subnets_flat : item.key => item }

  # 3. Normalize EC2 Instances (from VPCs)
  ec2_instances_flat = flatten([
    for item in local.subnets_flat : [
      for res in item.resources : [
        for inst in res.instances : {
          key           = "${item.vpc_name}-${item.name}-${inst.name}"
          vpc_name      = item.vpc_name
          subnet_key    = item.key
          name          = inst.name
          services      = inst.services
          domain        = try(inst.domain, null)
          ssl_email     = try(inst.ssl_email, null)
          ami           = var.default_ami
          instance_type = var.default_instance_type
        }
      ] if res.type == "EC2"
    ]
  ])
  ec2_instances = { for item in local.ec2_instances_flat : item.key => item }

  # 4. Normalize S3 Buckets (from Standalone)
  s3_buckets_flat = flatten([
    for svc in local.standalone_raw : [
      for inst in svc.instances : {
        key  = "standalone-${svc.type}-${inst.name}"
        name = lower(inst.name)
      }
    ] if svc.type == "S3"
  ])
  s3_buckets = { for item in local.s3_buckets_flat : item.key => item }

  # 5. Normalize ECR Repositories (from Standalone)
  ecr_repos_flat = flatten([
     for svc in local.standalone_raw : [
      for inst in svc.instances : {
        key  = "standalone-${svc.type}-${inst.name}"
        name = lower(inst.name)
      }
    ] if svc.type == "ECR"
  ])
  ecr_repositories = { for item in local.ecr_repos_flat : item.key => item }
}