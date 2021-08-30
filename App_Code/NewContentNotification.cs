using Umbraco.Core;
using Umbraco.Core.Events;
using Umbraco.Core.Logging;
using Umbraco.Core.Models;
using Umbraco.Core.Services;
using Umbraco.Core.Publishing;
using Umbraco.Web;
using System.Net.Mail;
using umbraco.cms.businesslogic.web;
using System.Collections;

namespace Winsford.EventHandlers
{

    public class NewContentNotification : ApplicationEventHandler
    {
        protected override void ApplicationStarted(UmbracoApplicationBase umbracoApplication, ApplicationContext applicationContext)
        {
#if false
            // Set the value of subscribeToEmails to true for all members
            IMemberService memberService = ApplicationContext.Current.Services.MemberService;
            var allMembers = memberService.GetAllMembers();
            foreach (IMember member in allMembers)
            {
                member.SetValue("subscribeToEmails", true);
                memberService.Save(member);
            }
#endif
            // Listen for when new content is published
            // Trying this again, because the other method is no longer working, but there was a
            // comment saying this fires before the cache is populated, so we can't get a URL reliably.
            ContentService.Published += ContentService_Published;
            // This method is deprecated, and we can no longer get an Umbraco context.
            //umbraco.content.AfterUpdateDocumentCache += content_AfterUpdateDocumentCache;
        }


        /// <summary>
        /// Listen for when new content is published, and call CheckNewPublishedContent
        /// This *should* work, but doesn't reliably, because the Published event fire before the cache has been updated.
        /// </summary>
        private void ContentService_Published(IPublishingStrategy sender, Umbraco.Core.Events.PublishEventArgs<IContent> args)
        {
            UmbracoHelper umbracoHelper = new UmbracoHelper( UmbracoContext.Current );
            foreach (var node in args.PublishedEntities)
            {
                CheckNewContent(node, umbracoHelper);
            }
        }


        /// <summary>
        /// Listen for when new the document cache has been updated, and call CheckNewPublishedContent
        /// This is technically deprecated, but no usable alternative has been provided.
        /// </summary>
        void content_AfterUpdateDocumentCache(Document sender, umbraco.cms.businesslogic.DocumentCacheEventArgs e)
        {
            var contentService = ApplicationContext.Current.Services.ContentService;
            var node = contentService.GetById(sender.Id);

            UmbracoHelper umbracoHelper = new UmbracoHelper(UmbracoContext.Current);
            CheckNewContent(node, umbracoHelper);
        }

        /// <summary>
        /// Call this when new content is published, it will email subscribers if it's a new news item or update notification.
        /// </summary>
        private void CheckNewContent( IContent content, UmbracoHelper umbracoHelper )
        {
            bool checkContentType = false;
            if( content.HasProperty("sentEmail") )
            {
                Attempt<bool> sentEmail = content.GetValue("sentEmail").TryConvertTo<bool>();
                checkContentType = sentEmail.Success && !sentEmail.Result;
            }
            if( checkContentType )
            {
                string url = "";
                string subjectPrefix = "";
                string additionalText = "";
                string emailSubject = "";
                bool sendEmail = false;
                bool onlySendToSelf = false;
                bool markAsEmailSentAfterSending = true;
                if (content.ContentType.Alias == "UpdateNotification")
                {
                    int targetId = content.GetValue<int>("page");
                    url = umbracoHelper.NiceUrlWithDomain( targetId );
                    //subjectPrefix = "Update: ";
                    additionalText = content.GetValue<string>("additionalText");
                    if( additionalText == null )
                    {
                        additionalText = "";
                    }
                    else
                    {
                        additionalText = @"<p style=""font-family: 'Open Sans', sans-serif; font-weight: 400; color: #666; font-size: 1.25em;"">" + additionalText + "</p>";
                    }
                    sendEmail = true;
                }
                else if (content.ContentType.Alias == "umbNewsItem")
                {
                    url = umbracoHelper.NiceUrlWithDomain( content.Id );
                    //subjectPrefix = "News: ";
                    sendEmail = true;
                }
                if( sendEmail )
                {
                    // Don't accidentally send emails from a local build.
                    if( !(url.StartsWith( "https://winsfordasc.co.uk" ) || url.StartsWith( "https://www.winsfordasc.co.uk" )) )
                    {
                        onlySendToSelf = true;
                        additionalText += "<h2>Not sent to everybody</h2>";
                        if( url.Length <= 1 )
                        {
                            // Looks like a bad link
                            emailSubject = "Bad URL";
                            additionalText += "<h2>Are you sure the update link is correct?</h2>";
                            markAsEmailSentAfterSending = false;
                        }
                    }
                }
                
                //sendEmail = false; // Temporarily disable while we figure out what to do with the google spam filter.
                //onlySendToSelf = true;
                //additionalText += "<h2>Not sent to everybody</h2>";
                if( sendEmail )
                {
                    try
                    {
                        // Email a notification to all subscribers
                        string title = content.GetValue< string >("Title");
                        string subject = string.IsNullOrWhiteSpace(title) ? content.Name : title;
                        if( url == "#" )
                        {
                            // Something went wrong when getting the Url of the IPublishedContent.
                            // Play it safe and direct the link to the news page.
                            url = "/news";
                        }

                        // Build address bundles of 10 each to try to confine mail sending problems
                        IMemberService memberService = ApplicationContext.Current.Services.MemberService;
                        var allMembers = memberService.GetMembersByPropertyValue("subscribeToEmails", 1);
                        ArrayList addressBundles = new ArrayList();
                        MailAddressCollection addressBundle = new MailAddressCollection();
                        foreach (IMember member in allMembers)
                        {
                            if( System.Web.Security.Roles.IsUserInRole( member.Username, "Parent" ) ||
                                System.Web.Security.Roles.IsUserInRole( member.Username, "Swimmer" ) )
                            {
                                if( onlySendToSelf )
                                {
                                    if(member.Email == "ol.wright@gmail.com")
                                    {
                                        addressBundle.Add( "ol.wright@gmail.com" );
                                    }
                                }
                                else
                                {
                                    addressBundle.Add( member.Email );
                                    if( addressBundle.Count == 10 )
                                    {
                                        addressBundles.Add( addressBundle );
                                        addressBundle = new MailAddressCollection();
                                    }
                                }
                            }
                        }
                        if( addressBundle.Count != 0 )
                        {
                            addressBundles.Add( addressBundle );
                        }

                        MailMessage message = new MailMessage();

                        // mail.winsfordasc.co.uk doesn't send messages if there's nobody in the 'To' field.
                        message.To.Add( "winsford.asc.web@gmail.com" );
                        message.Subject = (emailSubject.Length > 0) ? emailSubject : subject;
                        message.IsBodyHtml = true;
                        message.From = new MailAddress("web@winsfordasc.co.uk", "Winsford ASC");
                        message.Body = string.Format( emailTemplate, subjectPrefix + subject, url, additionalText );

                        SmtpClient smtp = new SmtpClient();
                        foreach( MailAddressCollection bundle in addressBundles )
                        {
                            message.Bcc.Clear();
                            foreach( MailAddress address in bundle )
                            {
                                message.Bcc.Add(address);
                            }
                            try
                            {
                                smtp.Send(message);
                            }
                            catch( SmtpException exception)
                            {
                                MailMessage exceptionMessage = new MailMessage();
                                exceptionMessage.To.Add( "ol.wright@gmail.com" );
                                exceptionMessage.From = new MailAddress("web@winsfordasc.co.uk", "Winsford ASC");
                                exceptionMessage.Subject = "SmtpException caught sending email";
                                exceptionMessage.Body = exception.ToString();
                                exceptionMessage.Body += "\n";
                                exceptionMessage.Body += addressBundle.ToString();
                                smtp.Send(exceptionMessage);
                            }
                            catch( System.Exception exception)
                            {
                                MailMessage exceptionMessage = new MailMessage();
                                exceptionMessage.To.Add( "ol.wright@gmail.com" );
                                exceptionMessage.From = new MailAddress("web@winsfordasc.co.uk", "Winsford ASC");
                                exceptionMessage.Subject = "System.Exception caught somewhere";
                                exceptionMessage.Body = exception.ToString();
                                exceptionMessage.Body += "\n";
                                exceptionMessage.Body += addressBundle.ToString();
                                smtp.Send(exceptionMessage);
                            }
                        }

                        if( markAsEmailSentAfterSending )
                        {
                            // Set the 'emailSent' property to prevent this item generating further emails
                            content.SetValue("sentEmail", 1);
                            IContentService contentService = ApplicationContext.Current.Services.ContentService;
                            contentService.Save(content);
                        }
                    }
                    catch( SmtpException exception)
                    {
                        MailMessage message = new MailMessage();
                        message.To.Add( "ol.wright@gmail.com" );
                        message.From = new MailAddress("web@winsfordasc.co.uk", "Winsford ASC");
                        message.Subject = "SmtpException caught sending email";
                        message.Body = exception.ToString();
                        SmtpClient smtp = new SmtpClient();
                        smtp.Send(message);
                    }
                    catch( System.Exception exception)
                    {
                        MailMessage message = new MailMessage();
                        message.To.Add( "ol.wright@gmail.com" );
                        message.From = new MailAddress("web@winsfordasc.co.uk", "Winsford ASC");
                        message.Subject = "System.Exception caught somewhere";
                        message.Body = exception.ToString();
                        SmtpClient smtp = new SmtpClient();
                        smtp.Send(message);
                    }
                }
            }
        }

const string emailTemplate = 
@"
<h2 style=""font-family: 'Open Sans Condensed', 'Arial Narrow', sans-serif; font-weight: 400; font-size: 1.5em; font-weight: bold; line-height: 1.2em; text-transform: uppercase;""><a style=""text-decoration: none; color: #78736C;""href=""{1}"">{0}</a></h2>
{2}
<a style=""font-family: 'Open Sans', sans-serif; font-weight: 400; color: #78736C; font-size: 1.25em;"" href=""{1}"">Click here for more.</a>
<p style=""font-family: 'Open Sans', sans-serif; font-weight: 400; color: #78736C; font-size: 0.8em;"">This is an automated email. You may reply to this email if you want to, but please be aware that you are replying to a machine. Try not to hurt its feelings.<br/>To unsubscribe from these emails please email <a href=""mailto:winsford.asc.web@gmail.com?Subject=Unsubscribe"">winsford.asc.website@gmail.com</a> with the word 'Unsubscribe' in the subject line.</p>
";

const string emailTemplate2 = 
@"
<h2 style=""font-family: 'Open Sans Condensed', 'Arial Narrow', sans-serif; font-weight: 400; font-size: 1.5em; font-weight: bold; line-height: 1.2em; text-transform: uppercase;""><a style=""text-decoration: none; color: #78736C;""href=""{1}"">{0}</a></h2>
{2}
";

    }
}