using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.IO;
using System.Threading;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Sheets.v4;
using Google.Apis.Sheets.v4.Data;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Umbraco.Core;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Winsford
{
    public class GoogleSheet : ApplicationEventHandler
    {
        private static string apiKey = null;
        public static Dictionary<string, string> spreadSheets;
        protected override void ApplicationStarted(UmbracoApplicationBase umbracoApplication, ApplicationContext applicationContext)
        {
            // Load the JSON configuration file, that contains our api key, and a list of spreadsheet ids
            // for those spreadsheets that we'd like to keep off GitHub
            string jsonFileName = HttpContext.Current.Server.MapPath("~/App_Data/GoogleSheetsData.json");
            StreamReader r = new StreamReader(jsonFileName);
            dynamic items = JsonConvert.DeserializeObject(r.ReadToEnd());
            apiKey = items["credentials"]["api-key"];
            // Convert the spreadsheets section into a string->string dictionary
            spreadSheets = ((IEnumerable<KeyValuePair<string, JToken>>)items["spreadsheets"])
                     .ToDictionary(kvp => kvp.Key, kvp => kvp.Value.ToString());
        }

        private static SheetsService GetSheetsService()
        {
            // Get a SheetsService using an API Key.
            // This will only allow us to retrieve data that is shared with anybody that has the URL.
            // TODO: Figure out how to use OAuth2 properly
            Google.Apis.Services.BaseClientService.Initializer initializer = new BaseClientService.Initializer();
            initializer.ApiKey = apiKey;
            initializer.ApplicationName = "Winsford ASC Website";
            Google.Apis.Sheets.v4.SheetsService service = new SheetsService(initializer);
            return service;
        }

        public static ValueRange ReadValueRange(string spreadsheetId, string cellRange)
        {
            SheetsService service = GetSheetsService();
            SpreadsheetsResource.ValuesResource.GetRequest getRequest = service.Spreadsheets.Values.Get(spreadsheetId, cellRange);

            ValueRange getResponse = getRequest.Execute();
            return getResponse;
        }

        public static IList<IList<Object>> Read(string spreadsheetId, string cellRange)
        {
            return ReadValueRange(spreadsheetId, cellRange).Values;
        }
        public static string GetStringValue(IList<Object> row, int column)
        {
            if (column < row.Count)
            {
                return row[column].ToString();
            }
            return "";
        }

    }
}