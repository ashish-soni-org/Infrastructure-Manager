# --------------------------------------------------------------------------- 
# VARIABLES
# ---------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS Region to provision resources in"
  type        = string
  default     = "ap-south-1"
}

variable "ui_manifest" {
  description = "Infrastructure manifest JSON payload sourced from the UI"
  type        = any
  default     = []
}

variable "default_ami" {
  description = "Default AMI ID for EC2 instances"
  type        = string
  default     = "ami-02b8269d5e85954ef" 
}

variable "default_instance_type" {
  description = "Default EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "root_volume_size" {
  description = "Size of the root volume in GB"
  type        = number
  default     = 30
}

variable "http_port" {
  description = "Port for HTTP traffic"
  type        = number
  default     = 80
}

variable "https_port" {
  description = "Port for HTTPS traffic"
  type        = number
  default     = 443
}

variable "all_ips_cidr" {
  description = "CIDR block allowing access from anywhere"
  type        = string
  default     = "0.0.0.0/0"
}

variable "any_protocol" {
  description = "Protocol code for 'any' protocol"
  type        = string
  default     = "-1"
}