from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("employees", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="employee",
            name="employee_id",
            field=models.CharField(blank=True, max_length=20, null=True, unique=True),
        ),
    ]
