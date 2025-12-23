output "service_inventory" {
  description = "Map of services to their associated Instance IDs for IPs"
  value = {
    # 1. Create a distinct list of all services requested across all instances
    for service in distinct(flatten([for inst in local.ec2_instances : inst.services])) :
    service => join(",", [
      # 2. Filter instances that have this specific service in their list
      for key, inst in aws_instance.EC2 : inst.id
      if contains({ for i in local.ec2_instances : i.key => i.services }[key], service)
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