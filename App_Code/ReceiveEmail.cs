using Umbraco.Core;
using Umbraco.Core.Events;
using Umbraco.Core.Models;
using Umbraco.Core.Services;
using OpenPop.Mime;
using OpenPop.Pop3;
using System.Net.Mail;
using System.Threading;

namespace Winsford
{
    public static class ReceiveEmail
    {
        public static string Check()
        {
            if (Interlocked.CompareExchange(ref locked, 1, 0) != 0)
            {
                // Only allow for one mail checking at once.
                return "Locked";
            }
            string text = "";
            try
            {
                connect();
                text = check();
            }
            catch(OpenPop.Pop3.Exceptions.PopServerNotAvailableException)
            {
                // Don't do anything
            }
            catch (System.Exception exception)
            {
                try
                {
                    text += "Exception: " + exception.ToString();
                    disconnect();

                    MailMessage message = new MailMessage();
                    message.To.Add("ol.wright@gmail.com");
                    message.From = new MailAddress("web@winsfordasc.co.uk", "Winsford ASC");
                    message.Subject = "System.Exception caught somewhere, when receiving email.";
                    message.Body = exception.ToString();
                    SmtpClient smtp = new SmtpClient();
                    smtp.Send(message);
                }
                catch(System.Exception)
                {
                    // Ignore
                }
            }
            // Just disconnect
            try
            {
                disconnect();
            }
            catch (System.Exception)
            {
                // err
            }
            locked = 0;
            return text;
        }

        private static Pop3Client client;
        private static int locked = 0;

        private static string check()
        {
            // Get the number of messages in the inbox
            int messageCount = client.GetMessageCount();
            if (messageCount == 0)
            {
                return "No messages";
            }

            string text = "";
            // Messages are numbered in the interval: [1, messageCount]
            // Ergo: message numbers are 1-based.
            // Most servers give the latest message the highest number
            for (int i = messageCount; i > 0; i--)
            {
                Message message = client.GetMessage(i);

                bool isValidFromAddress = false;
                string from = message.Headers.From.ToString();
                foreach (string address in emailAddressWhiteList)
                {
                    if(from.IndexOf(address) != -1)
                    {
                        isValidFromAddress = true;
                        break;
                    }
                }

                if(isValidFromAddress)
                {
                    text += "From: " + message.Headers.From + "\n";
                    text += "Subject: " + message.Headers.Subject + "\n";

                    MessagePart plainText = message.FindFirstPlainTextVersion();
                    if (plainText != null)
                    {
                        text += "Body: " + plainText.GetBodyAsText() + "\n";

                        // Create some new content for the announcement
                        IContentService cs = ApplicationContext.Current.Services.ContentService;
                        IContent newsItem = cs.CreateContent(message.Headers.Subject, 1073, "umbNewsItem");
                        newsItem.SetValue("sentEmail", false);
                        newsItem.SetValue("bodyText", plainText.GetBodyAsText());
                        cs.SaveAndPublishWithStatus(newsItem);
                    }
                }

                // Delete the message so we never see its like again
                client.DeleteMessage(i);
            }
            // Disconnect to cause the messages to be deleted
            disconnect();
            return text;
        }

        private static void connect()
        {
            if(client == null)
            {
                client = new Pop3Client();
            }
            if(!client.Connected)
            {
                //client.Connect("mail.winsfordascdev.co.uk", 110, false/*useSSL*/);
                //client.Authenticate("announce@winsfordascdev.co.uk", "7bY6z2$i");

                client.Connect("mail.winsfordasc.co.uk", 110, false/*useSSL*/);
                client.Authenticate("announce@winsfordasc.co.uk", "rsc4V$29");

            }
        }

        private static void disconnect()
        {
            if(client.Connected)
            {
                client.Disconnect();
            }
        }

        private static readonly string[] emailAddressWhiteList =
        {
            "ol.wright@gmail.com",
            "su.wright@gmail.com",
            "dangoodwin1@aol.com",
        };
    }
}
