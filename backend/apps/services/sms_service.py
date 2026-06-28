import africastalking
import os
from dotenv import load_dotenv

load_dotenv()

username = os.getenv("zidi_conntz")
api_key = os.getenv("atsk_f6b4b99ec5f6d8ffd6ec4e16e245bd8a72fafef859360d227af08cd71ccef78ba201b52e")

africastalking.initialize(username, api_key)

sms = africastalking.SMS


def send_sms(phone, message):
    try:
        response = sms.send(
            message,
            [phone]  # lazima iwe list
        )
        return response

    except Exception as e:
        print("SMS Error:", e)
        return None