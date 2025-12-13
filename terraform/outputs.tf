output "public_IP" {
  value = aws_instance.Production_server.public_ip
}

# output "region" {
#   value = aws_instance.Production_server.region
# }

# output "Id" {
#   value = aws_instance.Production_server.id
# }

# output "elastic_ip" {
#   value = aws_eip.Production_elastic_ip.public_ip
# }

# output "instance_type" {
#   value = aws_instance.Production_server.instance_type
# }

# output "bucket1" {
#   value = aws_s3_bucket.first_project_bucket.id
# }

# output "bucket2" {
#   value = aws_s3_bucket.second_project_bucket.id
# }

# output "ecr1" {
#   value = aws_ecr_repository.first_project_ECR.name
# }

# output "ecr2" {
#   value = aws_ecr_repository.second_project_ECR.name
# }