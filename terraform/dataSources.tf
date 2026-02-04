# --------------------------------------------------------------------------- 
# DATA SOURCES
# ---------------------------------------------------------------------------
# data "aws_iam_instance_profile" "ec2_profile" {
#   name = "Production-Server-SSM-Profile" 
# }

# TODO:
# data "aws_security_group" "Production_Security_Group" {
#   tags = {
#     name = "prod_sg"
#     ENV = "PROD"
#   }
# }