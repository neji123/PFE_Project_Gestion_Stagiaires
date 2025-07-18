using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PFE.application.DTOs;
using PFE.application.Interfaces;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace PFE.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PublicationsController : ControllerBase
    {
        private readonly IPostService _postService;

        public PublicationsController(IPostService postService)
        {
            _postService = postService;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
            if (userIdClaim == null || string.IsNullOrEmpty(userIdClaim.Value) || !int.TryParse(userIdClaim.Value, out int userId))
                throw new UnauthorizedAccessException("Impossible de déterminer l'utilisateur connecté.");
            return userId;
        }

        // GET: api/Publications
        [HttpGet]
        [Authorize(Roles = "RHs,Stagiaire,Tuteur")]
        public async Task<IActionResult> GetAllPosts()
        {
            try
            {
                int userId = GetCurrentUserId();
                var posts = await _postService.GetAllPostsAsync(userId);
                return Ok(posts);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Publications
        [HttpPost]
        [Authorize(Roles = "RHs")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreatePost([FromForm] PostCreateDto dto)
        {
            try
            {
                var authorIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (authorIdClaim == null)
                    return Unauthorized(new { message = "Utilisateur non authentifié." });

                int authorId = int.Parse(authorIdClaim.Value);

                var post = await _postService.CreatePostAsync(authorId, dto);
                return Ok(post);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Publications/{postId}/like
        [HttpPost("{postId}/like")]
        [Authorize(Roles = "Tuteur,Stagiaire,RHs")]
        public async Task<IActionResult> LikePost(int postId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                    return Unauthorized(new { message = "Utilisateur non authentifié." });

                int userId = int.Parse(userIdClaim.Value);

                await _postService.LikePostAsync(postId, userId);
                return Ok(new { message = "Like ajouté avec succès." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Publications/{postId}/unlike
        [HttpPost("{postId}/unlike")]
        [Authorize(Roles = "Tuteur,Stagiaire,RHs")]
        public async Task<IActionResult> UnlikePost(int postId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                    return Unauthorized(new { message = "Utilisateur non authentifié." });

                int userId = int.Parse(userIdClaim.Value);

                await _postService.UnlikePostAsync(postId, userId);
                return Ok(new { message = "Like retiré avec succès." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Publications/{postId}/comment
        [HttpPost("{postId}/comment")]
        [Authorize(Roles = "Tuteur,Stagiaire,RHs")]
        public async Task<IActionResult> CommentPost(int postId, [FromBody] string comment)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                    return Unauthorized(new { message = "Utilisateur non authentifié." });

                int userId = int.Parse(userIdClaim.Value);

                if (string.IsNullOrWhiteSpace(comment))
                    return BadRequest(new { message = "Le commentaire ne peut pas être vide." });

                await _postService.AddCommentAsync(postId, userId, comment);
                return Ok(new { message = "Commentaire ajouté avec succès." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // NOUVELLE ROUTE : GET: api/Publications/{postId}/likes
        [HttpGet("{postId}/likes")]
        [Authorize(Roles = "RHs,Stagiaire,Tuteur")]
        public async Task<IActionResult> GetPostLikes(int postId)
        {
            try
            {
                var likes = await _postService.GetPostLikesAsync(postId);
                return Ok(likes);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        // PUT: api/Publications/{postId}
        [HttpPut("{postId}")]
        [Authorize(Roles = "RHs")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdatePost(int postId, [FromForm] PostCreateDto dto)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                    return Unauthorized(new { message = "Utilisateur non authentifié." });

                int userId = int.Parse(userIdClaim.Value);
                var post = await _postService.UpdatePostAsync(postId, userId, dto);
                return Ok(post);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE: api/Publications/{postId}
        [HttpDelete("{postId}")]
        [Authorize(Roles = "RHs")]
        public async Task<IActionResult> DeletePost(int postId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                    return Unauthorized(new { message = "Utilisateur non authentifié." });

                int userId = int.Parse(userIdClaim.Value);
                await _postService.DeletePostAsync(postId, userId);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}