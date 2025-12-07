package logger

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"runtime"
	"time"
)

// LogLevel represents the severity of a log message
type LogLevel string

const (
	DEBUG LogLevel = "DEBUG"
	INFO  LogLevel = "INFO"
	WARN  LogLevel = "WARN"
	ERROR LogLevel = "ERROR"
)

// Logger represents a structured logger
type Logger struct {
	output io.Writer
	level  LogLevel
}

// LogEntry represents a single log entry
type LogEntry struct {
	Timestamp string                 `json:"timestamp"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Context   map[string]interface{} `json:"context,omitempty"`
	File      string                 `json:"file,omitempty"`
	Line      int                    `json:"line,omitempty"`
}

var defaultLogger *Logger

func init() {
	defaultLogger = New(os.Stdout, INFO)
}

// New creates a new Logger instance
func New(output io.Writer, level LogLevel) *Logger {
	return &Logger{
		output: output,
		level:  level,
	}
}

// SetLevel sets the minimum log level
func (l *Logger) SetLevel(level LogLevel) {
	l.level = level
}

// shouldLog checks if a message at the given level should be logged
func (l *Logger) shouldLog(level LogLevel) bool {
	levels := map[LogLevel]int{
		DEBUG: 0,
		INFO:  1,
		WARN:  2,
		ERROR: 3,
	}
	return levels[level] >= levels[l.level]
}

// log writes a log entry
func (l *Logger) log(level LogLevel, message string, context map[string]interface{}) {
	if !l.shouldLog(level) {
		return
	}

	entry := LogEntry{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Level:     string(level),
		Message:   message,
		Context:   context,
	}

	// Add file and line information for ERROR level
	if level == ERROR {
		_, file, line, ok := runtime.Caller(2)
		if ok {
			entry.File = file
			entry.Line = line
		}
	}

	data, err := json.Marshal(entry)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to marshal log entry: %v\n", err)
		return
	}

	fmt.Fprintln(l.output, string(data))
}

// Debug logs a debug message
func (l *Logger) Debug(message string, context ...map[string]interface{}) {
	ctx := mergeContext(context...)
	l.log(DEBUG, message, ctx)
}

// Info logs an info message
func (l *Logger) Info(message string, context ...map[string]interface{}) {
	ctx := mergeContext(context...)
	l.log(INFO, message, ctx)
}

// Warn logs a warning message
func (l *Logger) Warn(message string, context ...map[string]interface{}) {
	ctx := mergeContext(context...)
	l.log(WARN, message, ctx)
}

// Error logs an error message
func (l *Logger) Error(message string, context ...map[string]interface{}) {
	ctx := mergeContext(context...)
	l.log(ERROR, message, ctx)
}

// WithContext returns a new logger with additional context
func (l *Logger) WithContext(ctx context.Context) *Logger {
	// Extract common context values if present
	return l
}

// mergeContext merges multiple context maps into one
func mergeContext(contexts ...map[string]interface{}) map[string]interface{} {
	if len(contexts) == 0 {
		return nil
	}

	result := make(map[string]interface{})
	for _, ctx := range contexts {
		for k, v := range ctx {
			result[k] = v
		}
	}
	return result
}

// Package-level functions using the default logger

// SetDefaultLevel sets the level for the default logger
func SetDefaultLevel(level LogLevel) {
	defaultLogger.SetLevel(level)
}

// Debug logs a debug message using the default logger
func Debug(message string, context ...map[string]interface{}) {
	defaultLogger.Debug(message, context...)
}

// Info logs an info message using the default logger
func Info(message string, context ...map[string]interface{}) {
	defaultLogger.Info(message, context...)
}

// Warn logs a warning message using the default logger
func Warn(message string, context ...map[string]interface{}) {
	defaultLogger.Warn(message, context...)
}

// Error logs an error message using the default logger
func Error(message string, context ...map[string]interface{}) {
	defaultLogger.Error(message, context...)
}
