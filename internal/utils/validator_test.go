package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Test struct for validation
type TestUser struct {
	Email    string `validate:"required,email"`
	Name     string `validate:"required,min=2,max=50"`
	Age      int    `validate:"required,min=1,max=150"`
	Website  string `validate:"omitempty,url"`
	Bio      string `validate:"omitempty,max=500"`
}

type TestPost struct {
	Title   string `validate:"required,min=3,max=200,persian_or_english"`
	Content string `validate:"required,min=10"`
	Slug    string `validate:"required,url_safe"`
}

func TestValidateStruct(t *testing.T) {
	t.Run("validates valid struct", func(t *testing.T) {
		user := TestUser{
			Email:   "test@example.com",
			Name:    "Test User",
			Age:     25,
			Website: "https://example.com",
			Bio:     "This is a test bio",
		}

		err := ValidateStruct(user)

		assert.NoError(t, err)
	})

	t.Run("returns error for missing required field", func(t *testing.T) {
		user := TestUser{
			Name: "Test User",
			Age:  25,
		}

		err := ValidateStruct(user)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Email")
		assert.Contains(t, err.Error(), "required")
	})

	t.Run("returns error for invalid email", func(t *testing.T) {
		user := TestUser{
			Email: "invalid-email",
			Name:  "Test User",
			Age:   25,
		}

		err := ValidateStruct(user)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Email")
	})

	t.Run("returns error for value below minimum", func(t *testing.T) {
		user := TestUser{
			Email: "test@example.com",
			Name:  "A", // Too short
			Age:   25,
		}

		err := ValidateStruct(user)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Name")
		assert.Contains(t, err.Error(), "at least")
	})

	t.Run("returns error for value above maximum", func(t *testing.T) {
		user := TestUser{
			Email: "test@example.com",
			Name:  "Test User",
			Age:   200, // Too high
		}

		err := ValidateStruct(user)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Age")
	})

	t.Run("validates optional fields", func(t *testing.T) {
		user := TestUser{
			Email: "test@example.com",
			Name:  "Test User",
			Age:   25,
			// Website and Bio are optional
		}

		err := ValidateStruct(user)

		assert.NoError(t, err)
	})
}

func TestCustomValidators(t *testing.T) {
	t.Run("validates Persian text", func(t *testing.T) {
		type PersianTest struct {
			Text string `validate:"persian"`
		}

		validTests := []string{
			"سلام",
			"بیتکوین",
			"تست فارسی",
		}

		for _, text := range validTests {
			t.Run(text, func(t *testing.T) {
				test := PersianTest{Text: text}
				err := ValidateStruct(test)
				assert.NoError(t, err)
			})
		}
	})

	t.Run("rejects non-Persian text", func(t *testing.T) {
		type PersianTest struct {
			Text string `validate:"persian"`
		}

		test := PersianTest{Text: "Hello World"}
		err := ValidateStruct(test)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Persian")
	})

	t.Run("validates URL-safe text", func(t *testing.T) {
		type URLSafeTest struct {
			Text string `validate:"url_safe"`
		}

		validTests := []string{
			"hello-world",
			"test_123",
			"my.file.name",
			"simple",
		}

		for _, text := range validTests {
			t.Run(text, func(t *testing.T) {
				test := URLSafeTest{Text: text}
				err := ValidateStruct(test)
				assert.NoError(t, err)
			})
		}
	})

	t.Run("rejects non-URL-safe text", func(t *testing.T) {
		type URLSafeTest struct {
			Text string `validate:"url_safe"`
		}

		invalidTests := []string{
			"hello world",
			"test@123",
			"my/file",
			"test!",
		}

		for _, text := range invalidTests {
			t.Run(text, func(t *testing.T) {
				test := URLSafeTest{Text: text}
				err := ValidateStruct(test)
				assert.Error(t, err)
			})
		}
	})

	t.Run("validates no HTML", func(t *testing.T) {
		type NoHTMLTest struct {
			Text string `validate:"no_html"`
		}

		validTest := NoHTMLTest{Text: "This is plain text"}
		err := ValidateStruct(validTest)
		assert.NoError(t, err)

		invalidTest := NoHTMLTest{Text: "This has <script>alert('xss')</script>"}
		err = ValidateStruct(invalidTest)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "HTML")
	})

	t.Run("validates Persian or English", func(t *testing.T) {
		type TextTest struct {
			Text string `validate:"persian_or_english"`
		}

		validTests := []string{
			"Hello World",
			"سلام دنیا",
			"Hello سلام",
		}

		for _, text := range validTests {
			t.Run(text, func(t *testing.T) {
				test := TextTest{Text: text}
				err := ValidateStruct(test)
				assert.NoError(t, err)
			})
		}
	})
}

func TestValidateEmail(t *testing.T) {
	t.Run("validates correct emails", func(t *testing.T) {
		validEmails := []string{
			"test@example.com",
			"user.name@example.com",
			"user+tag@example.co.uk",
			"test123@test.io",
		}

		for _, email := range validEmails {
			t.Run(email, func(t *testing.T) {
				assert.True(t, ValidateEmail(email))
			})
		}
	})

	t.Run("rejects invalid emails", func(t *testing.T) {
		invalidEmails := []string{
			"",
			"invalid",
			"@example.com",
			"test@",
			"test @example.com",
			"test@example",
		}

		for _, email := range invalidEmails {
			t.Run(email, func(t *testing.T) {
				assert.False(t, ValidateEmail(email))
			})
		}
	})
}

func TestValidateURL(t *testing.T) {
	t.Run("validates correct URLs", func(t *testing.T) {
		validURLs := []string{
			"http://example.com",
			"https://example.com",
			"https://example.com/path",
			"https://example.com/path?query=value",
		}

		for _, url := range validURLs {
			t.Run(url, func(t *testing.T) {
				assert.True(t, ValidateURL(url))
			})
		}
	})

	t.Run("rejects invalid URLs", func(t *testing.T) {
		invalidURLs := []string{
			"",
			"example.com",
			"ftp://example.com",
			"not a url",
		}

		for _, url := range invalidURLs {
			t.Run(url, func(t *testing.T) {
				assert.False(t, ValidateURL(url))
			})
		}
	})
}

func TestValidatePassword(t *testing.T) {
	t.Run("validates strong passwords", func(t *testing.T) {
		validPasswords := []string{
			"password123",
			"MyPass123",
			"test1234",
			"رمزعبور123",
		}

		for _, password := range validPasswords {
			t.Run(password, func(t *testing.T) {
				err := ValidatePassword(password)
				assert.NoError(t, err)
			})
		}
	})

	t.Run("rejects short passwords", func(t *testing.T) {
		err := ValidatePassword("pass1")

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "at least 8 characters")
	})

	t.Run("rejects passwords without letters", func(t *testing.T) {
		err := ValidatePassword("12345678")

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "at least one letter")
	})

	t.Run("rejects passwords without numbers", func(t *testing.T) {
		err := ValidatePassword("password")

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "at least one number")
	})
}

func TestSanitizeInput(t *testing.T) {
	t.Run("removes null bytes", func(t *testing.T) {
		input := "test\x00string"
		expected := "teststring"

		result := SanitizeInput(input)

		assert.Equal(t, expected, result)
	})

	t.Run("trims whitespace", func(t *testing.T) {
		input := "  test string  "
		expected := "test string"

		result := SanitizeInput(input)

		assert.Equal(t, expected, result)
	})

	t.Run("handles empty string", func(t *testing.T) {
		input := ""
		expected := ""

		result := SanitizeInput(input)

		assert.Equal(t, expected, result)
	})

	t.Run("handles whitespace-only string", func(t *testing.T) {
		input := "   "
		expected := ""

		result := SanitizeInput(input)

		assert.Equal(t, expected, result)
	})
}

func TestValidateRole(t *testing.T) {
	t.Run("validates correct roles", func(t *testing.T) {
		validRoles := []string{"USER", "AUTHOR", "ADMIN", "SUPER_ADMIN"}

		for _, role := range validRoles {
			t.Run(role, func(t *testing.T) {
				assert.True(t, ValidateRole(role))
			})
		}
	})

	t.Run("rejects invalid roles", func(t *testing.T) {
		invalidRoles := []string{"", "INVALID", "user", "Admin", "MODERATOR"}

		for _, role := range invalidRoles {
			t.Run(role, func(t *testing.T) {
				assert.False(t, ValidateRole(role))
			})
		}
	})
}

func TestValidatePostStatus(t *testing.T) {
	t.Run("validates correct statuses", func(t *testing.T) {
		validStatuses := []string{"DRAFT", "PENDING_REVIEW", "PUBLISHED"}

		for _, status := range validStatuses {
			t.Run(status, func(t *testing.T) {
				assert.True(t, ValidatePostStatus(status))
			})
		}
	})

	t.Run("rejects invalid statuses", func(t *testing.T) {
		invalidStatuses := []string{"", "INVALID", "draft", "Published"}

		for _, status := range invalidStatuses {
			t.Run(status, func(t *testing.T) {
				assert.False(t, ValidatePostStatus(status))
			})
		}
	})
}

func TestValidateCommentStatus(t *testing.T) {
	t.Run("validates correct statuses", func(t *testing.T) {
		validStatuses := []string{"PENDING", "APPROVED", "REJECTED"}

		for _, status := range validStatuses {
			t.Run(status, func(t *testing.T) {
				assert.True(t, ValidateCommentStatus(status))
			})
		}
	})

	t.Run("rejects invalid statuses", func(t *testing.T) {
		invalidStatuses := []string{"", "INVALID", "pending", "Approved"}

		for _, status := range invalidStatuses {
			t.Run(status, func(t *testing.T) {
				assert.False(t, ValidateCommentStatus(status))
			})
		}
	})
}

func TestPostValidation(t *testing.T) {
	t.Run("validates valid post", func(t *testing.T) {
		post := TestPost{
			Title:   "تست عنوان پست",
			Content: "This is a test content that is long enough",
			Slug:    "test-post-slug",
		}

		err := ValidateStruct(post)

		require.NoError(t, err)
	})

	t.Run("rejects post with short title", func(t *testing.T) {
		post := TestPost{
			Title:   "ab",
			Content: "This is a test content",
			Slug:    "test",
		}

		err := ValidateStruct(post)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Title")
	})

	t.Run("rejects post with invalid slug", func(t *testing.T) {
		post := TestPost{
			Title:   "Test Title",
			Content: "This is a test content",
			Slug:    "invalid slug with spaces",
		}

		err := ValidateStruct(post)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Slug")
	})
}
