output "service_inventory" {
  description = "Map of services to their associated Instance IDs for IPs"

  value = {
    for service in distinct(flatten([for inst in local.ec2_instances : inst.services])) :
    service => join(",", [
      for key, inst in aws_instance.EC2 : inst.id
      if contains({ for i in local.ec2_instances : i.key => i.services }[key], service)
    ])
  }
}

output "map_domain_inventory" {
  description = "Per-EC2 domain, IP, and SSL metadata for DNS mapping"

  value = [
    for inst in local.ec2_instances : {
      key          = inst.key
      instance_id  = aws_instance.EC2[inst.key].id

      ip = try(
        aws_eip.ELASTIC_IP[inst.key].public_ip,
        aws_instance.EC2[inst.key].private_ip
      )

      domain       = inst.domain
      domain_email = inst.ssl_email
    }
    if contains(inst.services, "Map Domain")
  ]
}

output "provisioned_names" {
  description = "Map of provisioned S3 buckets and ECR repositories for Secrets Manager update"
  value = {
    s3_buckets = {
      for key, bucket in aws_s3_bucket.S3_BUCKET :
      local.s3_buckets[key].name => bucket.bucket
    }
    ecr_repositories = {
      for key, repo in aws_ecr_repository.ECR_REPO :
      local.ecr_repositories[key].name => repo.name
    }
  }
}

# output "bucket1" {
#   value = aws_s3_bucket.first_project_bucket.id
# }

# output "ecr1" {
#   value = aws_ecr_repository.first_project_ECR.name
# }




# output "instance_id" {
#   value = aws_instance.Production_server.id
# }

# # output "region" {
# #   value = aws_instance.Production_server.region
# # }

# # output "Id" {
# #   value = aws_instance.Production_server.id
# # }

# output "elastic_ip" {
#   value = aws_eip.Production_elastic_ip.public_ip
# }

# # output "instance_type" {
# #   value = aws_instance.Production_server.instance_type
# # }

# # output "bucket2" {
# #   value = aws_s3_bucket.second_project_bucket.id
# # }

# # output "ecr1" {
# #   value = aws_ecr_repository.first_project_ECR.name
# # }

# # output "ecr2" {
# #   value = aws_ecr_repository.second_project_ECR.name
# # }