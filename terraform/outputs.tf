output "service_inventory" { 
  description = "JSON-compatible map of Services to EC2 Instance IDs for Ansible Inventory"
  value = {
    for service in distinct(flatten([for inst in local.ec2_instances_flat : inst.services])) :
    service => join(",", [
      for key, inst in aws_instance.EC2 : inst.id
      if contains(local.ec2_instances[key].services, service)
    ])
  }
}

output "map_domain_inventory" {
  description = "Detailed inventory for instances requiring DNS/SSL configuration"
  value = [
    for inst in local.ec2_instances_flat : {
      key          = inst.key
      instance_id  = aws_instance.EC2[inst.key].id
      # Prioritize EIP, fallback to Public IP, then Private IP
      ip           = try(aws_eip.ELASTIC_IP[inst.key].public_ip, aws_instance.EC2[inst.key].public_ip, aws_instance.EC2[inst.key].private_ip)
      domain       = inst.domain
      domain_email = inst.ssl_email
    }
    if contains(inst.services, "Map Domain")
  ]
}

output "provisioned_resources" {
  description = "Map of provisioned standalone resources for Secrets Manager updates"
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