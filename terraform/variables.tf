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
  default     = "t3.micro"
}