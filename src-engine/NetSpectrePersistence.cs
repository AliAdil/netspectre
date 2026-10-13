using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading;

namespace NetSpectre
{
    /// <summary>
    /// Thread-safe local JSON persistence layer for NETSPECTRE v3.1 Enterprise.
    /// Stores persistent usage history, environment profiles, alert rules, incidents, and device agents.
    /// Storage location: %APPDATA%\NetSpectre\data\
    /// </summary>
    public static class NetSpectrePersistence
    {
        private static readonly object fileLock = new object();
        private static readonly string dataDirectory;

        public static string DataDirectory { get { return dataDirectory; } }

        static NetSpectrePersistence()
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            dataDirectory = Path.Combine(appData, "NetSpectre", "data");
            try
            {
                if (!Directory.Exists(dataDirectory))
                {
                    Directory.CreateDirectory(dataDirectory);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("[PERSISTENCE] Error initializing data directory: " + ex.Message);
            }
        }

        public static string ReadFile(string filename, string defaultContent)
        {
            lock (fileLock)
            {
                try
                {
                    string path = Path.Combine(dataDirectory, filename);
                    if (File.Exists(path))
                    {
                        return File.ReadAllText(path, Encoding.UTF8);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("[PERSISTENCE] Error reading " + filename + ": " + ex.Message);
                }
                return defaultContent;
            }
        }

        public static bool WriteFile(string filename, string content)
        {
            lock (fileLock)
            {
                try
                {
                    string path = Path.Combine(dataDirectory, filename);
                    string tmpPath = path + ".tmp";
                    File.WriteAllText(tmpPath, content, Encoding.UTF8);
                    if (File.Exists(path))
                    {
                        File.Delete(path);
                    }
                    File.Move(tmpPath, path);
                    return true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine("[PERSISTENCE] Error writing " + filename + ": " + ex.Message);
                    return false;
                }
            }
        }

        #region Usage & Bandwidth Persistence

        public class DailyUsageRecord
        {
            public string date; // YYYY-MM-DD
            public long totalBytesDownloaded;
            public long totalBytesUploaded;
            public Dictionary<string, long> appDownloadBytes = new Dictionary<string, long>();
            public Dictionary<string, long> appUploadBytes = new Dictionary<string, long>();
        }

        public static void SaveUsageSnapshot(string json)
        {
            WriteFile("usage_history.json", json);
        }

        public static string LoadUsageSnapshot()
        {
            return ReadFile("usage_history.json", "{\"records\":[],\"dailyQuotaMb\":5000,\"monthlyQuotaMb\":50000}");
        }

        #endregion

        #region Environment Profiles Persistence

        public static void SaveEnvProfiles(string json)
        {
            WriteFile("env_profiles.json", json);
        }

        public static string LoadEnvProfiles()
        {
            string defaultJson = "[{\"id\":\"env-1\",\"name\":\"Production Gateway\",\"env\":\"PROD\",\"url\":\"https://api.github.com\",\"expectedStatus\":200,\"timeoutMs\":3000,\"authType\":\"None\",\"authSecret\":\"\",\"intervalSec\":15,\"status\":\"ONLINE\",\"latencyMs\":24,\"uptimePct\":99.9}," +
                "{\"id\":\"env-2\",\"name\":\"Cloudflare Staging\",\"env\":\"UAT\",\"url\":\"https://cloudflare.com\",\"expectedStatus\":200,\"timeoutMs\":3000,\"authType\":\"None\",\"authSecret\":\"\",\"intervalSec\":15,\"status\":\"ONLINE\",\"latencyMs\":16,\"uptimePct\":100.0}," +
                "{\"id\":\"env-3\",\"name\":\"Integration Mock Hub\",\"env\":\"SIT\",\"url\":\"https://httpbin.org/get\",\"expectedStatus\":200,\"timeoutMs\":4000,\"authType\":\"None\",\"authSecret\":\"\",\"intervalSec\":30,\"status\":\"ONLINE\",\"latencyMs\":65,\"uptimePct\":99.5}," +
                "{\"id\":\"env-4\",\"name\":\"Local Development Node\",\"env\":\"DEV\",\"url\":\"http://127.0.0.1:48123/api/status\",\"expectedStatus\":200,\"timeoutMs\":1000,\"authType\":\"None\",\"authSecret\":\"\",\"intervalSec\":5,\"status\":\"ONLINE\",\"latencyMs\":1,\"uptimePct\":100.0}]";
            return ReadFile("env_profiles.json", defaultJson);
        }

        #endregion

        #region Alert Rules & History Persistence

        public static void SaveAlertRules(string json)
        {
            WriteFile("alert_rules.json", json);
        }

        public static string LoadAlertRules()
        {
            string defaultJson = "[{\"id\":\"rule-1\",\"name\":\"Large Upload Burst\",\"type\":\"LARGE_UPLOAD\",\"threshold\":50,\"unit\":\"MB\",\"enabled\":true}," +
                "{\"id\":\"rule-2\",\"name\":\"High Gateway Latency\",\"type\":\"GATEWAY_LATENCY\",\"threshold\":100,\"unit\":\"ms\",\"enabled\":true}," +
                "{\"id\":\"rule-3\",\"name\":\"Packet Loss Outage\",\"type\":\"PACKET_LOSS\",\"threshold\":15,\"unit\":\"%\",\"enabled\":true}," +
                "{\"id\":\"rule-4\",\"name\":\"DNS Resolution Failure\",\"type\":\"DNS_FAILURE\",\"threshold\":1,\"unit\":\"count\",\"enabled\":true}," +
                "{\"id\":\"rule-5\",\"name\":\"TLS Certificate Expiration Warning\",\"type\":\"TLS_EXPIRY\",\"threshold\":30,\"unit\":\"days\",\"enabled\":true}]";
            return ReadFile("alert_rules.json", defaultJson);
        }

        public static void SaveAlertHistory(string json)
        {
            WriteFile("alert_history.json", json);
        }

        public static string LoadAlertHistory()
        {
            return ReadFile("alert_history.json", "[]");
        }

        #endregion

        #region Incident Forensics Persistence

        public static void SaveIncidents(string json)
        {
            WriteFile("incidents.json", json);
        }

        public static string LoadIncidents()
        {
            return ReadFile("incidents.json", "[]");
        }

        #endregion

        #region Remote Device Agents Persistence

        public static void SaveDeviceAgents(string json)
        {
            WriteFile("device_agents.json", json);
        }

        public static string LoadDeviceAgents()
        {
            string defaultJson = "[{\"id\":\"dev-1\",\"name\":\"Default Local Gateway\",\"host\":\"192.168.1.1\",\"role\":\"Local Router\",\"status\":\"ONLINE\",\"latencyMs\":0,\"token\":\"local-internal\",\"osVersion\":\"RouterOS / Linux\",\"isAgent\":false}," +
                "{\"id\":\"dev-2\",\"name\":\"Cloudflare Anycast DNS\",\"host\":\"1.1.1.1\",\"role\":\"Primary Resolver\",\"status\":\"ONLINE\",\"latencyMs\":15,\"token\":\"public\",\"osVersion\":\"Edge Cloud\",\"isAgent\":false}," +
                "{\"id\":\"dev-3\",\"name\":\"Google Public DNS\",\"host\":\"8.8.8.8\",\"role\":\"Secondary Resolver\",\"status\":\"ONLINE\",\"latencyMs\":16,\"token\":\"public\",\"osVersion\":\"Edge Cloud\",\"isAgent\":false}]";
            return ReadFile("device_agents.json", defaultJson);
        }

        #endregion

        #region Browser Observability Persistence

        public static void SaveBrowserObservations(string json)
        {
            WriteFile("browser_observations.json", json);
        }

        public static string LoadBrowserObservations()
        {
            return ReadFile("browser_observations.json", "[]");
        }

        #endregion
    }
}
