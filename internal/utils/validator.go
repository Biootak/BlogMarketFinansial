package utils

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"

	"github.com/go-playground/validator/v10"
)

var (
	// validate is the singleton validator instance
	validate *validator.Validate
	
	// Persian/Arabic character range regex
	// \p{Arabic} matches Arabic script, \x{200C} is zero-width non-joiner
	persianRegex = regexp.MustCompile(`[\p{Arabic}\x{200C}]+`)
	
	// URL validation regex (simplified)
	urlRegex = regexp.MustCompile(`^https?://[^\s]+$`)
	
	// Email validation regex
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
)

func init() {
	// Initialize validator instance
	validate = validator.New()
	
	// Register custom validators
	validate.RegisterValidation("persian", validatePersianText)
	validate.RegisterValidation("url_safe", validateURLSafe)
	validate.RegisterValidation("no_html", validateNoHTML)
	validate.RegisterValidation("persian_or_english", validatePersianOrEnglish)
}

// ValidateStruct validates a struct using the validator instance
// Returns a formatted error message if validation fails
func ValidateStruct(s interface{}) error {
	err := validate.Struct(s)
	if err == nil {
		return nil
	}
	
	// Format validation errors
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		return formatValidationErrors(validationErrors)
	}
	
	return err
}

// formatValidationErrors converts validator errors to a readable format
func formatValidationErrors(errors validator.ValidationErrors) error {
	var messages []string
	
	for _, err := range errors {
		var message string
		
		switch err.Tag() {
		case "required":
			message = fmt.Sprintf("%s is required", err.Field())
		case "email":
			message = fmt.Sprintf("%s must be a valid email address", err.Field())
		case "min":
			message = fmt.Sprintf("%s must be at least %s characters", err.Field(), err.Param())
		case "max":
			message = fmt.Sprintf("%s must be at most %s characters", err.Field(), err.Param())
		case "url":
			message = fmt.Sprintf("%s must be a valid URL", err.Field())
		case "persian":
			message = fmt.Sprintf("%s must contain Persian text", err.Field())
		case "url_safe":
			message = fmt.Sprintf("%s contains invalid characters for URL", err.Field())
		case "no_html":
			message = fmt.Sprintf("%s must not contain HTML tags", err.Field())
		case "persian_or_english":
			message = fmt.Sprintf("%s must contain Persian or English text", err.Field())
		default:
			message = fmt.Sprintf("%s failed validation: %s", err.Field(), err.Tag())
		}
		
		messages = append(messages, message)
	}
	
	return fmt.Errorf("validation failed: %s", strings.Join(messages, "; "))
}

// validatePersianText checks if the field contains Persian/Arabic characters
func validatePersianText(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	if value == "" {
		return true // Let required tag handle empty values
	}
	
	return persianRegex.MatchString(value)
}

// validateURLSafe checks if the field contains only URL-safe characters
func validateURLSafe(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	if value == "" {
		return true
	}
	
	// URL-safe characters: alphanumeric, hyphen, underscore, dot
	for _, char := range value {
		if !unicode.IsLetter(char) && !unicode.IsDigit(char) && 
		   char != '-' && char != '_' && char != '.' {
			return false
		}
	}
	
	return true
}

// validateNoHTML checks if the field contains HTML tags
func validateNoHTML(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	if value == "" {
		return true
	}
	
	// Simple check for HTML tags
	return !strings.Contains(value, "<") && !strings.Contains(value, ">")
}

// validatePersianOrEnglish checks if the field contains Persian or English text
func validatePersianOrEnglish(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	if value == "" {
		return true
	}
	
	// Check if contains Persian characters or English letters
	hasPersian := persianRegex.MatchString(value)
	hasEnglish := regexp.MustCompile(`[a-zA-Z]+`).MatchString(value)
	
	return hasPersian || hasEnglish
}

// ValidateEmail validates an email address
func ValidateEmail(email string) bool {
	return emailRegex.MatchString(email)
}

// ValidateURL validates a URL
func ValidateURL(url string) bool {
	return urlRegex.MatchString(url)
}

// ValidatePassword validates password strength
// Minimum 8 characters, at least one letter and one number
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}
	
	hasLetter := false
	hasDigit := false
	
	for _, char := range password {
		if unicode.IsLetter(char) {
			hasLetter = true
		}
		if unicode.IsDigit(char) {
			hasDigit = true
		}
	}
	
	if !hasLetter {
		return fmt.Errorf("password must contain at least one letter")
	}
	
	if !hasDigit {
		return fmt.Errorf("password must contain at least one number")
	}
	
	return nil
}

// SanitizeInput removes potentially dangerous characters from input
func SanitizeInput(input string) string {
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")
	
	// Trim whitespace
	input = strings.TrimSpace(input)
	
	return input
}

// ValidateRole checks if a role is valid
func ValidateRole(role string) bool {
	validRoles := map[string]bool{
		"USER":        true,
		"AUTHOR":      true,
		"ADMIN":       true,
		"SUPER_ADMIN": true,
	}
	
	return validRoles[role]
}

// ValidatePostStatus checks if a post status is valid
func ValidatePostStatus(status string) bool {
	validStatuses := map[string]bool{
		"DRAFT":          true,
		"PENDING_REVIEW": true,
		"PUBLISHED":      true,
	}
	
	return validStatuses[status]
}

// ValidateCommentStatus checks if a comment status is valid
func ValidateCommentStatus(status string) bool {
	validStatuses := map[string]bool{
		"PENDING":  true,
		"APPROVED": true,
		"REJECTED": true,
	}
	
	return validStatuses[status]
}
