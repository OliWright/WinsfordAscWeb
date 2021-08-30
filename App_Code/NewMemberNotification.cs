using Umbraco.Core;
using Umbraco.Core.Events;
using Umbraco.Core.Logging;
using Umbraco.Core.Models;
using Umbraco.Core.Services;
using Umbraco.Web;
using System.Net.Mail;

namespace Winsford.EventHandlers
{

    public class NewMemberNotification : ApplicationEventHandler
    {
        protected override void ApplicationStarted(UmbracoApplicationBase umbracoApplication, ApplicationContext applicationContext)
        {
#if false
            // Set the value of sentWelcomeEmail to true for all members
            IMemberService memberService = ApplicationContext.Current.Services.MemberService;
            var allMembers = memberService.GetAllMembers();
            foreach (IMember member in allMembers)
            {
                member.SetValue("sentWelcomeEmail", true);
                memberService.Save(member);
            }
#endif
            // We'd like to listen for when members are created, but unfortunately
            // there's an issue in Umbraco where the Name field just contains the email
            // address at creation time.
            // So instead we have to listen for when members are saved instead
            MemberService.Saved += MemberService_Saved;
        }

        /// <summary>
        /// Listen for when a new member is created, and email winsford.asc.web
        /// </summary>
        private void MemberService_Saved(IMemberService memberService, Umbraco.Core.Events.SaveEventArgs<IMember> e)
        {
            foreach (IMember member in e.SavedEntities)
            {
                // Check to see if the 'sentWelcomeEmail' is created and false.
                // If it is, that means that this is a genuine new member that we need to send an email to.
                Attempt<bool> sentWelcomeEmail = member.GetValue("sentWelcomeEmail").TryConvertTo<bool>();
                if(sentWelcomeEmail.Success && !sentWelcomeEmail.Result)
                {
                    try
                    {
						bool nameIsSpam = member.Name.Contains(":") || member.Name.Contains("@") || member.Name.Contains(".");

						if(!nameIsSpam)
						{
							// Email a welcome message to the new member
							MailMessage message = new MailMessage();
							message.To.Add( member.Email );
							message.Subject = "Winsford ASC Website Registration";
							message.IsBodyHtml = false;
							message.From = new MailAddress("web@winsfordasc.co.uk");

							// The email body is stored in the Umbraco database as /data/registration-email-template/
							IPublishedContent emailBodyContent = UmbracoContext.Current.ContentCache.GetByRoute("/data/registration-email-template");
							string emailBody = emailBodyContent.GetPropertyValue<string>("text");
							emailBody = emailBody.Replace("<Name>", member.Name);

							message.Body = emailBody;

							SmtpClient smtp = new SmtpClient();
							smtp.Send(message);

							// Email us to let us know to expect a reply soon from the new member
							message.Subject = "New Member Registration";
							message.To.Clear();
							message.To.Add("winsford.asc.web@gmail.com");
							message.Body = "Name :" + member.Name + "\nEmail: " + member.Email;
							smtp.Send(message);
						}

                        // Set the sentWelcomeEmail and subscribeToEmails properties to true
                        member.SetValue("sentWelcomeEmail", true);
                        member.SetValue("subscribeToEmails", !nameIsSpam);
                        memberService.Save(member);
                    }
                    catch
                    {}
                }

            }
        }
    }
}