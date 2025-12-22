resource "aws_vpc" "VPC" {
  for_each   = local.vpcs
  cidr_block = "10.0.0.0/16" # In a real scenario, you'd pass this from the UI too
  tags       = { Name = each.value.name }
}

# TODO: 1. Create an Internet Gateway for each VPC
resource "aws_internet_gateway" "IGW" {
  for_each = local.vpcs
  vpc_id   = aws_vpc.VPC[each.key].id
  tags     = { Name = "${each.value.name}-igw" }
}

# TODO:  2. Create a Route Table that sends traffic (0.0.0.0/0) to the IGW
resource "aws_route_table" "RT" {
  for_each = local.vpcs
  vpc_id   = aws_vpc.VPC[each.key].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.IGW[each.key].id
  }

  tags = { Name = "${each.value.name}-rt" }
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
  security_groups = [ data.aws_security_group.Production_Security_Group.id ]

  # Map to the specific subnet ID. 
  # This assumes your data source or resource for subnets is indexed by the subnet name.
  subnet_id = aws_subnet.SUBNET["${each.value.vpc_name}-${each.value.subnet_name}"].id

  tags = {
    Name = each.value.name
    VPC    = each.value.vpc_name
    Subnet = each.value.subnet_name
    Services = join(",", each.value.services)
  }
}

resource "random_id" "RAND_ID" {
  for_each = { for bucket in local.s3_buckets : bucket.key => bucket }
  byte_length = 8
}

resource "aws_s3_bucket" "S3_BUCKET" {
  for_each = { for b in local.s3_buckets : b.key => b }
  bucket = "${each.value.name}-${random_id.RAND_ID[each.key].hex}"
}

resource "aws_ecr_repository" "ECR_REPO" {
  for_each = { for repo in local.ecr_repositories : repo.key => repo }
  name     = each.value.name
  image_scanning_configuration { scan_on_push = true }
}