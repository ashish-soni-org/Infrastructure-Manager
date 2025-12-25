variable "ui_manifest" {
  type        = any
  description = "Infrastructure manifest from the UI"
}

locals {
  # ---------------------------------------------------------------------------
  # Professional Normalization: Handle both Object-based and String-based manifests
  # ---------------------------------------------------------------------------
  
  # Check if the input is a list of strings (e.g., ["S3", "ECR"])
  is_simple_list = try(length(var.ui_manifest) > 0 && can(tostring(var.ui_manifest[0])), false)

  # If it's a simple list, we wrap it in a default structure to satisfy the logic
  normalized_manifest = local.is_simple_list ? [
    {
      vpc_name = "default-vpc"
      subnets = [
        {
          subnet_name = "default-subnet"
          resources = [
            {
              type = "S3"
              instances = [for s in var.ui_manifest : { name = s } if s == "S3"]
            },
            {
              type = "ECR"
              instances = [for s in var.ui_manifest : { name = s } if s == "ECR"]
            },
            {
              type = "EC2"
              instances = [] # No EC2s in a simple service request
            }
          ]
        }
      ]
    }
  ] : var.ui_manifest

  # ---------------------------------------------------------------------------
  # Grouping Logic (Now uses normalized_manifest)
  # ---------------------------------------------------------------------------
  vpc_events = {
    for vpc in local.normalized_manifest :
    vpc.vpc_name => vpc...
  }

  vpcs = {
    for vpc_name, events in local.vpc_events :
    vpc_name => { name = vpc_name }
  }

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
  # Resource Normalization (EC2, S3, ECR)
  # ---------------------------------------------------------------------------
  
  # EC2 Instances
  ec2_instances_grouped = {
    for item in flatten([
      for vpc_name, events in local.vpc_events : [
        for e in events : [
          for sn in e.subnets : [
            for res in sn.resources : [
              for inst in res.instances : {
                key           = "${vpc_name}-${sn.subnet_name}-${inst.name}"
                vpc_name      = vpc_name
                subnet_name   = sn.subnet_name
                name          = inst.name
                services      = try(inst.services, [])
                domain        = try(inst.domain, null)
                ssl_email     = try(inst.ssl_email, null)
                ami           = "ami-02b8269d5e85954ef"
                instance_type = "t3.micro"
              } if res.type == "EC2"
            ]
          ]
        ]
      ]
    ]) : item.key => item...
  }
  ec2_instances = { for k, v in local.ec2_instances_grouped : k => v[0] }

  # S3 Buckets
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
  s3_buckets = { for k, v in local.s3_buckets_grouped : k => v[0] }

  # ECR Repositories
  ecr_repositories_grouped = {
    for item in flatten([
      for vpc_name, events in local.vpc_events : [
        for e in events : [
          for sn in e.subnets : [
            for res in sn.resources : [
              for inst in res.instances : {
                key  = "${vpc_name}-${sn.subnet_name}-${inst.name}"
                name = lower(inst.name)
              } if res.type == "ECR"
            ]
          ]
        ]
      ]
    ]) : item.key => item...
  }
  ecr_repositories = { for k, v in local.ecr_repositories_grouped : k => v[0] }
}




























# locals {
#   # ---------------------------------------------------------------------------
#   # Static configuration (temporary; UI-driven later)
#   # ---------------------------------------------------------------------------
#   instance_type = "t3.micro"
#   ami           = "ami-02b8269d5e85954ef"

#   # ---------------------------------------------------------------------------
#   # STEP 1: Group manifest by VPC name (event-sourced → state-based)
#   # ---------------------------------------------------------------------------
#   vpc_events = {
#     for vpc in var.ui_manifest :
#     vpc.vpc_name => vpc...
#   }

#   # ---------------------------------------------------------------------------
#   # STEP 2: Normalize VPCs (unique by name)
#   # ---------------------------------------------------------------------------
#   vpcs = {
#     for vpc_name, events in local.vpc_events :
#     vpc_name => {
#       name = vpc_name
#     }
#   }

#   # ---------------------------------------------------------------------------
#   # STEP 3: Normalize Subnets (unique per VPC + subnet)
#   # ---------------------------------------------------------------------------
#   subnets_grouped = {
#     for item in flatten([
#       for vpc_name, events in local.vpc_events : [
#         for e in events : [
#           for sn in e.subnets : {
#             key      = "${vpc_name}-${sn.subnet_name}"
#             vpc_name = vpc_name
#             name     = sn.subnet_name
#           }
#         ]
#       ]
#     ]) : item.key => item...
#   }

#   subnets = {
#     for k, items in local.subnets_grouped :
#     k => items[length(items) - 1]
#   }


#   # ---------------------------------------------------------------------------
#   # STEP 4: Normalize EC2 instances (unique per permanent key)
#   # ---------------------------------------------------------------------------
#   ec2_instances_grouped = {
#     for item in flatten([
#       for vpc_name, events in local.vpc_events : [
#         for e in events : [
#           for sn in e.subnets : [
#             for res in sn.resources : [
#               for inst in res.instances : {
#                 key         = "${vpc_name}-${sn.subnet_name}-${inst.name}"
#                 vpc_name    = vpc_name
#                 subnet_name = sn.subnet_name
#                 name        = inst.name
#                 services    = inst.services

#                 domain    = try(inst.domain, null)
#                 ssl_email = try(inst.ssl_email, null)

#                 ami           = local.ami
#                 instance_type = local.instance_type
#               } if res.type == "EC2"
#             ]
#           ]
#         ]
#       ]
#     ]) : item.key => item...
#   }

#   ec2_instances = {
#     for k, items in local.ec2_instances_grouped :
#     k => items[length(items) - 1]
#   }

#   # ---------------------------------------------------------------------------
#   # STEP 5: Normalize S3 buckets (unique by key)
#   # ---------------------------------------------------------------------------
#   s3_buckets_grouped = {
#     for item in flatten([
#       for vpc_name, events in local.vpc_events : [
#         for e in events : [
#           for sn in e.subnets : [
#             for res in sn.resources : [
#               for inst in res.instances : {
#                 key  = "${vpc_name}-${sn.subnet_name}-${inst.name}"
#                 name = lower(inst.name)
#               } if res.type == "S3"
#             ]
#           ]
#         ]
#       ]
#     ]) : item.key => item...
#   }

#   s3_buckets = {
#     for k, items in local.s3_buckets_grouped :
#     k => items[length(items) - 1]
#   }

# # ---------------------------------------------------------------------------
#   # STEP 6: Normalize ECR repositories (FIXED: Unique Map for for_each)
#   # ---------------------------------------------------------------------------
#   ecr_repositories_grouped = {
#     for item in flatten([
#       for vpc_name, events in local.vpc_events : [
#         for e in events : [
#           for sn in e.subnets : [
#             for res in sn.resources : [
#               for inst in res.instances : {
#                 key  = "${vpc_name}-${sn.subnet_name}-${inst.name}"
#                 name = lower(inst.name)
#               } if res.type == "ECR"
#             ]
#           ]
#         ]
#       ]
#     ]) : item.key => item...
#   }

#   ecr_repositories = {
#     for k, items in local.ecr_repositories_grouped :
#     k => items[length(items) - 1]
#   }
# }
