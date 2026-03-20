package common

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// SendSMS sends an SMS verification code to the given phone number
// using the AliCloud Market SMS API (dfsmsv2).
// The API uses form-encoded POST with Authorization: APPCODE <code>.
func SendSMS(phone, code string) error {
	if SMSAppCode == "" {
		return fmt.Errorf("SMS AppCode未配置，请在系统设置中配置短信网关")
	}
	if SMSGatewayHost == "" || SMSGatewayPath == "" {
		return fmt.Errorf("SMS网关地址未配置")
	}

	rawURL := SMSGatewayHost + SMSGatewayPath

	formData := url.Values{}
	formData.Set("content", fmt.Sprintf("code:%s", code))
	formData.Set("template_id", SMSTemplateId)
	formData.Set("phone_number", phone)

	req, err := http.NewRequest(http.MethodPost, rawURL, strings.NewReader(formData.Encode()))
	if err != nil {
		return fmt.Errorf("创建短信请求失败: %w", err)
	}
	req.Header.Set("Authorization", "APPCODE "+SMSAppCode)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("发送短信请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("短信发送失败，HTTP %d: %s", resp.StatusCode, string(body))
	}

	SysLog(fmt.Sprintf("SMS sent to %s, response: %s", phone, string(body)))
	return nil
}
