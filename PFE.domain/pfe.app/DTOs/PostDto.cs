using Microsoft.AspNetCore.Http;
using PFE.Application.DTOs;
using System;
using System.Collections.Generic;

namespace PFE.application.DTOs
{
    public class PostCreateDto
    {
        public string Content { get; set; }
        public List<IFormFile> Attachments { get; set; } = new List<IFormFile>();
    }

    public class PostDto
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public UserDto Author { get; set; }
        public List<PostAttachmentDto> Attachments { get; set; }
        public int LikesCount { get; set; }
        public List<PostCommentDto> Comments { get; set; }
        public bool LikedByCurrentUser { get; set; }
       
    }

    public class PostAttachmentDto
    {
        public int Id { get; set; }
        public string FileUrl { get; set; }
        public string FileType { get; set; }
    }

    public class PostCommentDto
    {
        public int Id { get; set; }
        public string Comment { get; set; }
        public DateTime CommentedAt { get; set; }
        public UserDto User { get; set; }
        public string ProfilePictureUrl { get; set; }
    }
    public class PostLikeDto
    {
        public int Id { get; set; }
        public DateTime LikedAt { get; set; }
        public UserDto User { get; set; }
    }
}