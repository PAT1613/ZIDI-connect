from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("communications", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="IntegrationSetting",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "key",
                    models.CharField(
                        choices=[
                            ("AT_USERNAME", "Africa's Talking Username"),
                            ("AT_API_KEY", "Africa's Talking API Key"),
                            ("AT_SENDER_ID", "Africa's Talking Sender ID"),
                            ("EMAIL_HOST", "SMTP Host"),
                            ("EMAIL_PORT", "SMTP Port"),
                            ("EMAIL_HOST_USER", "SMTP Username"),
                            ("EMAIL_HOST_PASSWORD", "SMTP Password"),
                            ("EMAIL_USE_TLS", "SMTP Use TLS"),
                            ("DEFAULT_FROM_EMAIL", "Default From Email"),
                            ("COMPANY_NAME", "Company Name"),
                            ("COMPANY_PHONE", "Company Phone"),
                            ("COMPANY_EMAIL", "Company Email"),
                            ("COMPANY_ADDRESS", "Company Address"),
                        ],
                        max_length=64,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("value", models.TextField(blank=True)),
            ],
            options={
                "verbose_name": "Integration Setting",
                "verbose_name_plural": "Integration Settings",
                "db_table": "communications_integrationsetting",
            },
        ),
    ]
