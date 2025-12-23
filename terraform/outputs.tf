output "service_inventory" {
  description = "Detailed inventory mapping services to Instance IDs and IPs"
  value = {
    for service in distinct(flatten([for inst in local.ec2_instances : inst.services])) :
    service => [
      for key, inst in aws_instance.EC2 : {
        id        = inst.id
        public_ip = inst.public_ip
        # Use EIP if available, otherwise public IP
        ip        = try(aws_eip.ELASTIC_IP[key].public_ip, inst.public_ip)
        # Extract the specific domain assigned to this instance from the local object
        domain    = lookups(local.ec2_instances[key], "domain", "")
      }
      if contains(local.ec2_instances[key].services, service)
    ]
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