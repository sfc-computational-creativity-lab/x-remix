{
	"name" : "M4L.AutoSampling",
	"version" : 1,
	"creationdate" : 3669374271,
	"modificationdate" : 3669629022,
	"viewrect" : [ 25.0, 104.0, 300.0, 500.0 ],
	"autoorganize" : 1,
	"hideprojectwindow" : 0,
	"showdependencies" : 1,
	"autolocalize" : 0,
	"contents" : 	{
		"patchers" : 		{
			"classification.maxpat" : 			{
				"kind" : "patcher",
				"local" : 1,
				"toplevel" : 1
			}

		}
,
		"code" : 		{
			"index.js" : 			{
				"kind" : "javascript",
				"local" : 1,
				"singleton" : 				{
					"bootpath" : "~/git/M4L.AutoSampling/M4L.AutoSampling/src",
					"projectrelativepath" : "./src"
				}

			}
,
			"audio_classification.js" : 			{
				"kind" : "javascript",
				"local" : 1,
				"singleton" : 				{
					"bootpath" : "~/git/x-remix/Node-for-Max-samples/AudioClassification_TFJS",
					"projectrelativepath" : "../../x-remix/Node-for-Max-samples/AudioClassification_TFJS"
				}

			}
,
			"dsp.js" : 			{
				"kind" : "javascript",
				"local" : 1,
				"singleton" : 				{
					"bootpath" : "~/git/x-remix/Node-for-Max-samples/AudioClassification_TFJS",
					"projectrelativepath" : "../../x-remix/Node-for-Max-samples/AudioClassification_TFJS"
				}

			}
,
			"onset.js" : 			{
				"kind" : "javascript",
				"local" : 1,
				"singleton" : 				{
					"bootpath" : "~/git/x-remix/Node-for-Max-samples/AudioClassification_TFJS",
					"projectrelativepath" : "../../x-remix/Node-for-Max-samples/AudioClassification_TFJS"
				}

			}

		}
,
		"data" : 		{
			"model.json" : 			{
				"kind" : "json",
				"local" : 1,
				"singleton" : 				{
					"bootpath" : "~/git/M4L.AutoSampling/M4L.AutoSampling/models/drum_classification_128_augmented",
					"projectrelativepath" : "./models/drum_classification_128_augmented"
				}

			}

		}

	}
,
	"layout" : 	{

	}
,
	"searchpath" : 	{
		"0" : 		{
			"bootpath" : "~/git/M4L.AutoSampling/M4L.AutoSampling/src",
			"projectrelativepath" : "./src",
			"label" : "src",
			"recursive" : 1,
			"enabled" : 1,
			"includeincollective" : 1
		}
,
		"1" : 		{
			"bootpath" : "~/git/M4L.AutoSampling/M4L.AutoSampling/node_modules",
			"projectrelativepath" : "./node_modules",
			"label" : "node modules",
			"recursive" : 1,
			"enabled" : 1,
			"includeincollective" : 1
		}
,
		"2" : 		{
			"bootpath" : "~/git/M4L.AutoSampling/M4L.AutoSampling/maxpatch",
			"projectrelativepath" : "./maxpatch",
			"label" : "subpatch",
			"recursive" : 1,
			"enabled" : 1,
			"includeincollective" : 1
		}

	}
,
	"detailsvisible" : 0,
	"amxdtype" : 1633771873,
	"readonly" : 0,
	"devpathtype" : 0,
	"devpath" : ".",
	"sortmode" : 0,
	"viewmode" : 0
}
