locals {
  # 1. Extract EC2 Instances
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
          } if res.type == "EC2"
        ]
      ]
    ]
  ])

  # 2. Extract S3 Buckets
  s3_buckets = flatten([
    for vpc in var.ui_manifest : [
      for sn in vpc.subnets : [
        for res in sn.resources : [
          for inst in res.instances : {
            key  = "${vpc.vpc_name}-${sn.subnet_name}-${inst.name}"
            name = inst.name
          } if res.type == "S3"
        ]
      ]
    ]
  ])
}