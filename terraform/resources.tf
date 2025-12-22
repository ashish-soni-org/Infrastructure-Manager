resource "aws_vpc" "VPC" {
  for_each   = local.vpcs
  cidr_block = "10.0.0.0/16" # In a real scenario, you'd pass this from the UI too
  tags       = { Name = each.value.name }
}

resource "aws_subnet" "SUBNET" {
  for_each   = { for sn in local.subnets : sn.key => sn }
  vpc_id     = aws_vpc.VPC[each.value.vpc_name].id
  cidr_block = "10.0.1.0/24" # Dynamic CIDR logic would be next
  tags       = { Name = each.value.name }
}

resource "aws_eip" "ELASTIC_IP" {
  for_each = { for inst in local.ec2_instances : inst.key => inst }

  domain   = "vpc"
  instance = aws_instance.EC2[each.key].id

  tags = {
    Name = "EIP-${each.value.name}"
  }
}

resource "aws_instance" "EC2" {
  for_each = { for inst in local.ec2_instances : inst.key => inst }
  
  ami = each.value.ami
  instance_type = each.value.instance_type

  iam_instance_profile = data.aws_iam_instance_profile.ec2_profile.name
  
#   TODO:
  # Note: If your data source depends on the VPC name from the UI, 
  # you would use each.value.vpc_name here.
#   security_groups = [ data.aws_security_group.Production_Security_Group.id ]

  # Map to the specific subnet ID. 
  # This assumes your data source or resource for subnets is indexed by the subnet name.
  subnet_id = aws_subnet.SUBNET["${each.value.vpc_name}-${each.value.subnet_name}"].id

  tags = {
    Name = each.value.name
    VPC    = each.value.vpc_name
    Subnet = each.value.subnet_name
  }
}

resource "aws_s3_bucket" "S3_BUCKET" {
  for_each = { for b in local.s3_buckets : b.key => b }
  bucket = "${each.value.name}-${random_string.suffix[each.key].result}"
}

resource "aws_ecr_repository" "ECR_REPO" {
  for_each = { for repo in local.ecr_repositories : repo.key => repo }
  name     = each.value.name
  image_scanning_configuration { scan_on_push = true }
}

# resource "local_file" "ansible_inventory" {
#   filename = "../ansible/inventory.ini"
#   content  = <<EOF
#     [prod]
#     ${aws_instance.Production_server.id} ansible_connection=${var.connection_type} ansible_aws_ssm_region=${var.region}
#   EOF
# }


# resource "aws_eip" "ELASTIC_IP" {
#   domain = "vpc"
#   instance = aws_instance.Production_server.id
# }

# resource "random_id" "RAND_ID" {
#   byte_length = 8
# }

# Helper to ensure unique bucket names
resource "random_string" "suffix" {
  for_each = { for bucket in local.s3_buckets : bucket.key => bucket }
  length   = 6
  special  = false
  upper    = false
}

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
