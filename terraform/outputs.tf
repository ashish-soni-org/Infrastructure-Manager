output "instance_public_ips" {
  description = "Map of instance keys to their public IP addresses"
  value = {
    for key, instance in aws_instance.EC2 : key => instance.public_ip
  }
}

output "service_inventory" {
  description = "Map of services to their associated Instance IDs"
  value = {
    # Extract unique services from the manifest and find their matching IDs
    for service in distinct(flatten([for inst in local.ec2_instances : inst.services])) :
    service => join(",", [
      for key, inst in aws_instance.EC2 : inst.id
      if contains(local.ec2_instances[key].services, service)
    ])
  }
}

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

# # output "bucket1" {
# #   value = aws_s3_bucket.first_project_bucket.id
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