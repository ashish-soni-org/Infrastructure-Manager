# resource "aws_iam_role" "ec2_ssm_role" {
#   name = "Production-Server-SSM-Role"

#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [{
#       Effect    = "Allow"
#       Principal = { Service = "ec2.amazonaws.com" }
#       Action    = "sts:AssumeRole"
#     }]
#   })
# }

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "Production-Server-SSM-Profile"
  role = data.aws_iam_role.ec2_ssm_role.name
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role      = aws_iam_role.ec2_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Production with SSM role
resource "aws_instance" "Production_server" {
  ami = var.ami
  instance_type = var.instance_type

  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name
  security_groups = [ data.aws_security_group.Production_Security_Group.id ]

  subnet_id = data.aws_subnet.Production_Subnet.id

  tags = {
    Name = var.server_name
  }
}

















# resource "aws_eip" "Production_elastic_ip" {
#   domain = "vpc"
#   instance = aws_instance.Production_server.id
# }

# resource "random_id" "rand_id" {
#   byte_length = 8
# }

# resource "aws_s3_bucket" "first_project_bucket" {
#   bucket = "project-1-${random_id.rand_id.hex}"
# }

# resource "aws_s3_bucket" "second_project_bucket" {
#   bucket = "project-2-${random_id.rand_id.hex}"
# }

# resource "aws_ecr_repository" "first_project_ECR" {
#   name = "project-1"
# }

# resource "aws_ecr_repository" "second_project_ECR" {
#   name = "project-2"
# }
