using Examine;
using Umbraco.Core;
namespace Winsford
{
    public class Search : ApplicationEventHandler
    {
        protected override void ApplicationStarted(UmbracoApplicationBase umbracoApplication, ApplicationContext applicationContext)
        {
            ExamineManager.Instance.IndexProviderCollection["SiteIndexer"].GatheringNodeData
                += OnExamineGatheringNodeData;
        }

        private void OnExamineGatheringNodeData(object sender, IndexingNodeDataEventArgs e)
        {
            string sortDate = "";
            if(!e.Fields.TryGetValue("publishDate", out sortDate))
            {
                e.Fields.TryGetValue("createDate", out sortDate);
            }
            e.Fields.Add("sortDate", sortDate);
        }
    }
}