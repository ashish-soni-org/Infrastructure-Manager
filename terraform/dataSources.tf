data "aws_iam_role" "ec2_ssm_role" {
  name = "Production-Server-SSM-Role"
}

data "aws_iam_instance_profile" "ec2_profile" {
  name = "Production-Server-SSM-Profile"
}

data "aws_security_group" "Production_Security_Group" {
  tags = {
    name = "prod_sg"
    ENV = "PROD"
  }
}