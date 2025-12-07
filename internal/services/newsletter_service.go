package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"biotak-go-backend/ent"
	"biotak-go-backend/ent/newsletter"
	"biotak-go-backend/ent/post"
)

// NewsletterService handles newsletter operations
type NewsletterService struct {
	client *ent.Client
}

// NewNewsletterService creates a new newsletter service
func NewNewsletterService(client *ent.Client) *NewsletterService {
	return &NewsletterService{
		client: client,
	}
}

// NewsletterContent represents the content to be sent in a newsletter
type NewsletterContent struct {
	Subject      string
	Body         string
	RecipientEmail string
	RecipientName  string
}

// GetActiveSubscribers fetches all active newsletter subscribers
func (s *NewsletterService) GetActiveSubscribers(ctx context.Context) ([]*ent.Newsletter, error) {
	subscribers, err := s.client.Newsletter.
		Query().
		Where(newsletter.IsActive(true)).
		WithUser().
		All(ctx)
	
	if err != nil {
		return nil, fmt.Errorf("failed to fetch active subscribers: %w", err)
	}
	
	log.Printf("[NewsletterService] Found %d active subscribers", len(subscribers))
	return subscribers, nil
}

// GeneratePersonalizedContent creates personalized newsletter content for a subscriber
func (s *NewsletterService) GeneratePersonalizedContent(ctx context.Context, subscriber *ent.Newsletter) (*NewsletterContent, error) {
	// Get recent published posts (last 7 days)
	weekAgo := time.Now().AddDate(0, 0, -7)
	
	posts, err := s.client.Post.
		Query().
		Where(
			post.StatusEQ(post.StatusPUBLISHED),
			post.CreatedAtGTE(weekAgo),
		).
		Order(ent.Desc(post.FieldCreatedAt)).
		Limit(5).
		WithAuthor().
		WithCategories().
		All(ctx)
	
	if err != nil {
		return nil, fmt.Errorf("failed to fetch recent posts: %w", err)
	}
	
	// Get subscriber name
	recipientName := "عزیز" // Default Persian greeting
	if subscriber.Edges.User != nil && subscriber.Edges.User.Name != nil && *subscriber.Edges.User.Name != "" {
		recipientName = *subscriber.Edges.User.Name
	}
	
	// Generate email content
	subject := fmt.Sprintf("خبرنامه بیوتک - %s", time.Now().Format("2006/01/02"))
	body := s.buildEmailBody(recipientName, posts)
	
	return &NewsletterContent{
		Subject:        subject,
		Body:           body,
		RecipientEmail: subscriber.Email,
		RecipientName:  recipientName,
	}, nil
}

// buildEmailBody constructs the HTML email body
func (s *NewsletterService) buildEmailBody(recipientName string, posts []*ent.Post) string {
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>خبرنامه بیوتک</title>
    <style>
        body { font-family: Tahoma, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #007bff; }
        .header h1 { color: #007bff; margin: 0; }
        .greeting { margin: 20px 0; font-size: 16px; }
        .post { margin: 20px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px; }
        .post-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .post-excerpt { color: #666; line-height: 1.6; }
        .post-meta { font-size: 12px; color: #999; margin-top: 10px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>بیوتک</h1>
            <p>بازارهای مالی و ارزهای دیجیتال</p>
        </div>
        
        <div class="greeting">
            <p>سلام %s،</p>
            <p>امیدواریم روز خوبی داشته باشید! در اینجا آخرین مطالب هفته گذشته را برای شما آماده کرده‌ایم:</p>
        </div>
`, recipientName)
	
	// Add posts
	if len(posts) == 0 {
		body += `
        <div class="post">
            <p>هیچ مطلب جدیدی در هفته گذشته منتشر نشده است.</p>
        </div>`
	} else {
		for _, p := range posts {
			authorName := "نویسنده"
			if p.Edges.Author != nil && p.Edges.Author.Name != nil {
				authorName = *p.Edges.Author.Name
			}
			
			excerpt := ""
			if p.Excerpt != nil {
				excerpt = *p.Excerpt
			} else if len(p.Content) > 200 {
				excerpt = p.Content[:200] + "..."
			}
			
			body += fmt.Sprintf(`
        <div class="post">
            <div class="post-title">%s</div>
            <div class="post-excerpt">%s</div>
            <div class="post-meta">نویسنده: %s | تاریخ: %s</div>
            <a href="https://biotak.ir/posts/%s" class="button">ادامه مطلب</a>
        </div>`, p.Title, excerpt, authorName, p.CreatedAt.Format("2006/01/02"), p.Slug)
		}
	}
	
	body += `
        <div class="footer">
            <p>این ایمیل به دلیل عضویت شما در خبرنامه بیوتک ارسال شده است.</p>
            <p>برای لغو اشتراک، <a href="https://biotak.ir/newsletter/unsubscribe">اینجا کلیک کنید</a>.</p>
            <p>&copy; 2024 بیوتک. تمامی حقوق محفوظ است.</p>
        </div>
    </div>
</body>
</html>`
	
	return body
}

// SendEmail sends an email (placeholder - actual implementation would use SMTP)
func (s *NewsletterService) SendEmail(ctx context.Context, content *NewsletterContent) error {
	// In a real implementation, this would use an SMTP library or email service
	// For now, we'll just log the email
	log.Printf("[NewsletterService] Sending email to %s: %s", content.RecipientEmail, content.Subject)
	
	// TODO: Implement actual email sending using SMTP
	// Example using net/smtp or a service like SendGrid, AWS SES, etc.
	
	return nil
}

// SendNewsletterBatch sends newsletters to a batch of subscribers
func (s *NewsletterService) SendNewsletterBatch(ctx context.Context, subscribers []*ent.Newsletter, batchSize int) (int, int, error) {
	successCount := 0
	failureCount := 0
	
	for i := 0; i < len(subscribers); i += batchSize {
		end := i + batchSize
		if end > len(subscribers) {
			end = len(subscribers)
		}
		
		batch := subscribers[i:end]
		log.Printf("[NewsletterService] Processing batch %d-%d of %d", i+1, end, len(subscribers))
		
		for _, subscriber := range batch {
			// Generate personalized content
			content, err := s.GeneratePersonalizedContent(ctx, subscriber)
			if err != nil {
				log.Printf("[NewsletterService] Failed to generate content for %s: %v", subscriber.Email, err)
				failureCount++
				continue
			}
			
			// Send email
			err = s.SendEmail(ctx, content)
			if err != nil {
				log.Printf("[NewsletterService] Failed to send email to %s: %v", subscriber.Email, err)
				failureCount++
				continue
			}
			
			successCount++
		}
		
		// Small delay between batches to avoid overwhelming the email server
		if end < len(subscribers) {
			time.Sleep(2 * time.Second)
		}
	}
	
	log.Printf("[NewsletterService] Newsletter batch complete: %d sent, %d failed", successCount, failureCount)
	return successCount, failureCount, nil
}
