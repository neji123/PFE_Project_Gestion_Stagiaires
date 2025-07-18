using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFE.domain.Entities
{
    public class Post
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("AuthorId")]
        public User Author { get; set; }
        public int AuthorId { get; set; }

        public ICollection<PostAttachment> Attachments { get; set; } = new List<PostAttachment>();
        public ICollection<PostLike> Likes { get; set; } = new List<PostLike>();
        public ICollection<PostComment> Comments { get; set; } = new List<PostComment>();
    }

    public class PostAttachment
    {
        public int Id { get; set; }
        public string FileUrl { get; set; }
        public string FileType { get; set; }

        [ForeignKey("PostId")]
        public Post Post { get; set; }
        public int PostId { get; set; }
    }

    public class PostLike
    {
        public int Id { get; set; }
        [ForeignKey("UserId")]
        public User User { get; set; }
        public int UserId { get; set; }

        [ForeignKey("PostId")]
        public Post Post { get; set; }
        public int PostId { get; set; }
        public DateTime LikedAt { get; set; } = DateTime.UtcNow;
    }

    public class PostComment
    {
        public int Id { get; set; }
        public string Comment { get; set; }
        public DateTime CommentedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public User User { get; set; }
        public int UserId { get; set; }

        [ForeignKey("PostId")]
        public Post Post { get; set; }
        public int PostId { get; set; }
    }
}