data "aws_vpc" "Production_VPC" {
  default = true
}
data "aws_subnet" "Production_Subnet" {
  default_for_az = true
  availability_zone = var.subnet_availability_zone
}

data "aws_security_group" "Production_Security_Group" {
  tags = {
    name = "prod_sg"
    ENV = "PROD"
  }
}