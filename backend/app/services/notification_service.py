from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx
from app.config import settings

class NotificationService:
    def __init__(self):
        self.fcm_enabled = False
        self.twilio_enabled = False

        try:
            if settings.twilio_account_sid and settings.twilio_auth_token:
                from twilio.rest import Client
                self.twilio_client = Client(
                    settings.twilio_account_sid,
                    settings.twilio_auth_token
                )
                self.twilio_enabled = True
        except Exception as e:
            print(f"Twilio initialization failed: {e}")

        try:
            import firebase_admin
            from firebase_admin import credentials, messaging
            if settings.fcm_credentials_path:
                cred = credentials.Certificate(settings.fcm_credentials_path)
                firebase_admin.initialize_app(cred)
                self.fcm_enabled = True
        except Exception as e:
            print(f"FCM initialization failed: {e}")

    async def send_alert_notification(
        self,
        alert: Dict[str, Any],
        channels: List[str],
        recipients: List[Dict[str, str]]
    ):
        notifications_sent = []

        for channel in channels:
            if channel == "fcm" and self.fcm_enabled:
                result = await self._send_fcm(alert, recipients)
                notifications_sent.append(result)
            elif channel == "sms" and self.twilio_enabled:
                result = await self._send_sms(alert, recipients)
                notifications_sent.append(result)
            elif channel == "webhook":
                result = await self._send_webhook(alert, recipients)
                notifications_sent.append(result)

        return notifications_sent

    async def _send_fcm(
        self,
        alert: Dict[str, Any],
        recipients: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        try:
            from firebase_admin import messaging

            tokens = [r.get("fcm_token") for r in recipients if r.get("fcm_token")]

            if not tokens:
                return {"channel": "fcm", "status": "no_recipients"}

            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=f"{alert['severity'].upper()}: {alert['primary_type']}",
                    body=alert.get('recommended_action', 'Check dashboard for details')
                ),
                data={
                    "alert_id": alert['id'],
                    "severity": alert['severity'],
                    "score": str(alert['final_score'])
                },
                tokens=tokens
            )

            response = messaging.send_multicast(message)

            return {
                "channel": "fcm",
                "status": "sent",
                "success_count": response.success_count,
                "failure_count": response.failure_count
            }
        except Exception as e:
            return {
                "channel": "fcm",
                "status": "error",
                "error": str(e)
            }

    async def _send_sms(
        self,
        alert: Dict[str, Any],
        recipients: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        try:
            phone_numbers = [r.get("phone") for r in recipients if r.get("phone")]

            if not phone_numbers:
                return {"channel": "sms", "status": "no_recipients"}

            message_body = (
                f"ALERT [{alert['severity'].upper()}]: {alert['primary_type']}\n"
                f"Score: {alert['final_score']:.2f}\n"
                f"{alert.get('recommended_action', 'Check dashboard')}"
            )

            sent_count = 0
            for phone in phone_numbers:
                try:
                    self.twilio_client.messages.create(
                        body=message_body,
                        from_=settings.twilio_from_number,
                        to=phone
                    )
                    sent_count += 1
                except Exception as e:
                    print(f"Failed to send SMS to {phone}: {e}")

            return {
                "channel": "sms",
                "status": "sent",
                "sent_count": sent_count,
                "total_recipients": len(phone_numbers)
            }
        except Exception as e:
            return {
                "channel": "sms",
                "status": "error",
                "error": str(e)
            }

    async def _send_webhook(
        self,
        alert: Dict[str, Any],
        recipients: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        try:
            webhook_urls = [r.get("webhook_url") for r in recipients if r.get("webhook_url")]

            if not webhook_urls:
                return {"channel": "webhook", "status": "no_recipients"}

            cap_message = self._create_cap_message(alert)

            sent_count = 0
            async with httpx.AsyncClient() as client:
                for url in webhook_urls:
                    try:
                        response = await client.post(
                            url,
                            json=cap_message,
                            timeout=10.0
                        )
                        if response.status_code < 400:
                            sent_count += 1
                    except Exception as e:
                        print(f"Failed to send webhook to {url}: {e}")

            return {
                "channel": "webhook",
                "status": "sent",
                "sent_count": sent_count,
                "total_recipients": len(webhook_urls)
            }
        except Exception as e:
            return {
                "channel": "webhook",
                "status": "error",
                "error": str(e)
            }

    def _create_cap_message(self, alert: Dict[str, Any]) -> Dict[str, Any]:
        severity_map = {
            "info": "Minor",
            "watch": "Moderate",
            "warning": "Severe",
            "critical": "Extreme"
        }

        return {
            "identifier": alert['id'],
            "sender": "early-warning-platform",
            "sent": alert['created_at'],
            "status": "Actual",
            "msgType": "Alert",
            "scope": "Public",
            "info": {
                "category": alert['primary_type'],
                "event": f"{alert['primary_type']} Alert",
                "urgency": "Immediate" if alert['severity'] == 'critical' else "Expected",
                "severity": severity_map.get(alert['severity'], "Unknown"),
                "certainty": "Likely",
                "headline": f"{alert['severity'].upper()}: {alert['primary_type']}",
                "description": alert.get('recommended_action', ''),
                "instruction": alert.get('recommended_action', ''),
                "parameter": {
                    "final_score": alert['final_score'],
                    "component_scores": alert['component_scores']
                }
            }
        }

notification_service = NotificationService()
