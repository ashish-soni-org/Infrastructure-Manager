# ---------------------------------------------------------------------------
# NETWORKING RESOURCES
# ---------------------------------------------------------------------------

resource "aws_vpc" "VPC" {
  for_each             = local.vpcs
  cidr_block           = each.value.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = each.value.name }
}

resource "aws_internet_gateway" "IGW" {
  for_each = local.vpcs
  vpc_id   = aws_vpc.VPC[each.key].id
  tags     = { Name = "${each.value.name}-igw" }
}

resource "aws_route_table" "RT" {
  for_each = local.vpcs
  vpc_id   = aws_vpc.VPC[each.key].id
  tags     = { Name = "${each.value.name}-rt" }
}

resource "aws_route" "public_internet_access" {
  for_each               = local.vpcs
  route_table_id         = aws_route_table.RT[each.key].id
  destination_cidr_block = var.all_ips_cidr
  gateway_id             = aws_internet_gateway.IGW[each.key].id
}

resource "aws_subnet" "SUBNET" {
  for_each                = local.subnets
  vpc_id                  = aws_vpc.VPC[each.value.vpc_name].id
  cidr_block              = each.value.cidr_block
  map_public_ip_on_launch = true
  tags                    = { Name = each.value.name }
}

resource "aws_route_table_association" "RT_ASSOC" {
  for_each       = local.subnets
  subnet_id      = aws_subnet.SUBNET[each.key].id
  route_table_id = aws_route_table.RT[each.value.vpc_name].id
}

resource "aws_security_group" "WEB_SG" {
  for_each    = local.vpcs
  name        = "web-access-${each.key}"
  description = "Allow HTTP/HTTPS access"
  vpc_id      = aws_vpc.VPC[each.key].id

  ingress {
    from_port   = var.http_port
    to_port     = var.http_port
    protocol    = "tcp"
    cidr_blocks = [var.all_ips_cidr]
  }

  ingress {
    from_port   = var.https_port
    to_port     = var.https_port
    protocol    = "tcp"
    cidr_blocks = [var.all_ips_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = var.any_protocol
    cidr_blocks = [var.all_ips_cidr]
  }

  tags = { Name = "web-access-${each.key}" }
}

# ---------------------------------------------------------------------------
# COMPUTE RESOURCES
# ---------------------------------------------------------------------------

resource "aws_instance" "EC2" {
  for_each = local.ec2_instances

  ami                  = each.value.ami
  instance_type        = each.value.instance_type
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name
  subnet_id            = aws_subnet.SUBNET[each.value.subnet_key].id
  
  vpc_security_group_ids = [
    aws_security_group.WEB_SG[each.value.vpc_name].id
  ]

  root_block_device {
    volume_size = var.root_volume_size
  }

  tags = {
    Name       = each.value.name
    VPC        = each.value.vpc_name
    Services   = join(",", each.value.services)
    Monitoring = "true"
  }
}

resource "aws_eip" "ELASTIC_IP" {
  for_each = local.ec2_instances
  domain   = "vpc"
  instance = aws_instance.EC2[each.key].id
  tags     = { Name = "EIP-${each.value.name}" }
}

# ---------------------------------------------------------------------------
# STORAGE & REGISTRY RESOURCES
# ---------------------------------------------------------------------------

resource "random_id" "BUCKET_SUFFIX" {
  for_each    = local.s3_buckets
  byte_length = 4
}

resource "aws_s3_bucket" "S3_BUCKET" {
  for_each      = local.s3_buckets
  bucket        = "${each.value.name}-${random_id.BUCKET_SUFFIX[each.key].hex}"
  force_destroy = true 
  tags          = { Name = each.value.name }
}

resource "aws_ecr_repository" "ECR_REPO" {
  for_each             = local.ecr_repositories
  name                 = each.value.name
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}