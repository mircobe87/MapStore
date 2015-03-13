/**
 *  Copyright (C) 2007 - 2012 GeoSolutions S.A.S.
 *  http://www.geo-solutions.it
 *
 *  GPLv3 + Classpath exception
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */



Ext.namespace('nrl.chartbuilder.crop');

/**
 * @author Lorenzo Natali
 * This file contain Chart builders for crops.
 * they need to implement: 
 * getData (json, aggregatedDataOnly,customOpt): parse data from features and generate the proper series for their chart
 *     * json 'Object' :  the geojson from the server.
 *     * aggregatedDataOnly: boolean that tells to get only the aggregated chart (used, ie. to get only whole pakistan chart)
 *     * customOpt: some options: mandatory object with following options 
 *         * variableCompare
 *         * highChartExportUrl
 *         * 
 * makeChart(data, opt, listVar, aggregatedDataOnly,customOpt): return a array of HighCharts charts
 */

/**
 *
 *    Builder for Composite Charts
 *
 */
nrl.chartbuilder.crop.composite = {
    
    getData: function (json, aggregatedDataOnly,customOpt){
		var chartData = [];
		
		for (var i=0 ; i<json.features.length; i++) {
			var feature = json.features[i];
			var obj = null;
			
			//search already existing entries
			for (var j=0; j<chartData.length; j++){
				if(chartData[j].region == feature.properties.region){
					obj = chartData[j];
				}
			}
			
			//create entry if doesn't exists yet
			if(!obj){
				obj = {
					region:feature.properties.region,
					title:feature.properties.region,
					subtitle:feature.properties.crop,
					rows: []/*,
					avgs:{
						area:0,
						prod:0,
						yield:0,
						years:0
					},
					*/
				};
				chartData.push(obj);
			}
			
			//create a row entry
			var yr = feature.properties.year;
			var a = feature.properties.area;
			var p = feature.properties.production;
			var yi = feature.properties.yield;
			
			obj.rows.push({
				time: yr,
				area: parseFloat(a.toFixed(2)),
				prod: parseFloat(p.toFixed(2)),
				yield: parseFloat(yi.toFixed(2))//,
				//crop: feature.properties.crop
			});
			
			//obj.avgs.area+=a;
			//obj.avgs.prod+=p;
			//obj.avgs.yield+=yi;
			//obj.avgs.years+=1;
		}
	
		//create mean chart if needed
		var mean;
		if (chartData.length > 1){			
			mean = {
				region: "all",
				title: "Aggregated data",
				subtitle: json.features[0].properties.crop,
				rows: []/*,
				avgs:{
					area:0,
					prod:0,
					yield:0,
					years:0
				}*/
			};

			var meanareas = []
			var meanproductions = [];
			var meanyields = [];
			var nyears = {};
			
			//sum all values
			for (var i=0; i<chartData.length; i++){
				var rows = chartData[i].rows;
				for (var j=0; j<rows.length; j++){
					var yr = rows[j].time;
					var area = rows[j].area;
					var prod = rows[j].prod;
					var yield = rows[j].yield;
					meanareas[yr] = (meanareas[yr] ? meanareas[yr] :0) + area;
					meanproductions[yr] = (meanproductions[yr] ? meanproductions[yr]:0) +prod;
					meanyields[yr] = (meanyields[yr] ? meanyields[yr]:0) +yield;
					nyears[yr] = (nyears[yr]?nyears[yr]:0) + 1;
				}
			}
			
			//divide by nyears
			for(var i=0 in nyears){				
				mean.rows.push({
					time: i,
					area: parseFloat(meanareas[i].toFixed(2)), //(meanareas[i]/nyears[i]).toFixed(2),
					prod: parseFloat(meanproductions[i].toFixed(2)), //(meanproductions[i]/nyears[i]).toFixed(2),
					yield: parseFloat((meanyields[i]/nyears[i]).toFixed(2))					
				});
			}
			
			chartData.push(mean);
		}	
		
		if(aggregatedDataOnly && mean){
			chartData = [mean];
		}else{		
			// Sorts array elements in ascending order numerically.
			function CompareForSort(first, second){
				if (first.time == second.time)
					return 0;
				if (first.time < second.time)
					return -1;
				else
					return 1; 
			}
			
			//sort all year ascending
			for (var i=0; i<chartData.length; i++){
				//chartData[i].rows.sort(function(a,b){return a.time > b.time});
				chartData[i].rows.sort(CompareForSort);        
			}
		}
        
		return chartData;
	},
	
    /**
     * private method[getOrderedChartConfigs]
     * get chart configurations properly sorted 
     * to place charts with line style on top and 
     * area styles behind. The fields of the ExtJs store 
     * needs and yAxis configuration needs to be sorted in the same way.
     * ``Object`` opt chartOpts object
     * data. data to use for the chart
     * 
     */
	getOrderedChartConfigs:function(opt,avgs){
        var ret = {};
        ret.series = [opt.series.prod,
					opt.series.yield,
					opt.series.area		];
        //sort series in an array (lines on top, than bars then areas)
        ret.series.sort(function(a,b){
            //area,bar,line,spline are aphabetically ordered as we want
            return a.type < b.type ? -1 : 1;
        });
        ret.avgs = [];
        //first element must be time, the other element 
        // must have the same order of the opt and yAxis
        ret.fields=  [{
            name: 'time',
            type: 'string'
        }];
        //sort avg objects
        for (var k in opt.series){
            for(var i = 0; i < ret.series.length; i++){
                if(ret.series[i]===opt.series[k]){
                    ret.avgs[i] = avgs[k];
                    
                }
            }
        }
        
        // generate yAxisConfig for each element
        ret.yAxis = [];
        for(var i = 0 ; i < ret.series.length; i++){
            //TODO FIX THIS: THE SORTING MUST BE DIFFERENT
            var yAxisIndex = i;
            //invert last 2 axes.
            switch(ret.series[i].dataIndex){
                case "area": yAxisIndex=0 ; break;
                case "prod": yAxisIndex=1 ; break;
                case "yield": yAxisIndex=2 ; break;
            } 
                
            ret.yAxis[yAxisIndex] = this.generateyAxisConfig(ret.series[i],ret.avgs[i]);
            //console.log("yAxis:"+  yAxisIndex + ",chartOpt:" + i + ret.yAxis[yAxisIndex].title.text + ";" + ret.series[i].name);
            // add opposite option to the yAxis config (except the first)
            if(yAxisIndex>0){
                var yAxis = ret.yAxis[yAxisIndex];
                yAxis.opposite = true;
                //yAxis.rotation = 90;
                
            }
        }
        return ret;

    
    },
    /**
     * private method[generateyAxisConfig]
     * generates the yAxis config.
     * opt: chartOpt 
     * avg: average line value
     */
    generateyAxisConfig: function(opt,avg){
        return { // AREA
            title: {
                text: opt.name,
                rotation: 270,
                style: {
                    color: opt.color,
                    backgroundColor: Ext.isIE ? '#ffffff' : "transparent"
                }
            },                    
            labels: {
                formatter: function () {
                    return this.value;
                },
                style: {
                    color: opt.color
                }
            },
            plotLines: [{ //mid values
                value: avg,
                color: opt.color,//opt.series.area.lcolor,
                dashStyle: 'LongDash',
                width: 1                       
            }]

        }
    
    },

	makeChart: function(data, opt, listVar, aggregatedDataOnly,customOpt){
		
		var charts = [];
		var getAvg = function(arr,type) {
			var sum = 0,len = arr.length;
			for (var i=0;i<len;i++){
				sum += arr[i][type];
			}
			return sum/len;
		};
		
		for (var r=0; r<data.length; r++){
            //calculate avg
            var prodavg = getAvg(data[r].rows,'prod');
			var yieldavg = getAvg(data[r].rows,'yield');
			var areaavg = getAvg(data[r].rows,'area');
			var avgs = {
                prod :prodavg,
                yield:yieldavg,
                area:areaavg
            }
            //get chart configs (sorting them properly)
            var chartConfig = this.getOrderedChartConfigs(opt,avgs);
            //console.log(chartConfig);
			// Store for random data
			var fields = [{
					name: 'time',
					type: 'string'
				} , {
					name: 'area',
					type: 'float'
				}, {
					name: 'prod',
					type: 'float'
				}, {
					name: 'yield',
					type: 'float'
				},{
					name:'crop',
					type:'string'
			}];
			
			var store = new Ext.data.JsonStore({
				data: data[r],
				fields:  fields,
				root: 'rows'
			});

			var chart;
			
			//
			// Making Chart Title
			//
			var text = "";
			var dataTitle = data[r].title.toUpperCase();
			var commodity = listVar.commodity.toUpperCase();
            
			var chartTitle = listVar.chartTitle.split(',')[r];
			
			if(dataTitle){				
				if(dataTitle == "AGGREGATED DATA"){
					if(aggregatedDataOnly){
						text += dataTitle + " (Pakistan) - " + commodity;
					}else{
						text += dataTitle + " - " + commodity;
					}					
				}else{
					text += commodity + " - " + chartTitle;
				}
			}
			
			//
			// AOI Subtitle customization
			//
			var aoiSubtitle = "";
			if(dataTitle == "AGGREGATED DATA"){
				if(aggregatedDataOnly){
					aoiSubtitle += "Pakistan";
				}else{
					aoiSubtitle += listVar.chartTitle;
				}	
			}else{
				aoiSubtitle += chartTitle;
			}
			
			chart = new Ext.ux.HighChart({
				series: chartConfig.series,				
				
				height: opt.height,
				//width: 900,
				store: store,
				animShift: true,
				xField: 'time',
				chartConfig: {
					chart: {
						zoomType: 'x',
                        spacingBottom: 145                       
					},
                    exporting: {
                        enabled: true,
                        width: 1200,
                        url: customOpt.highChartExportUrl 
                    },
					title: {
						//text: (data[r].title.toUpperCase()=="AGGREGATED DATA" ? data[r].title.toUpperCase() + " - " + listVar.commodity.toUpperCase() : listVar.commodity.toUpperCase() +" - "+listVar.chartTitle.split(',')[r]) // + " - " + (listVar.numRegion.length == 1 ? listVar.chartTitle : listVar.chartTitle.split(',')[r])
						text: text
					},
					subtitle: {
                        text: '<span style="font-size:10px;">Source: Pakistan Crop Portal</span><br />'+
                              '<span style="font-size:10px;">Date: '+ listVar.today +'</span><br />'+
                              '<span style="font-size:10px;">AOI: '+ aoiSubtitle /*(data[r].title.toUpperCase()=="AGGREGATED DATA" ? listVar.chartTitle : listVar.chartTitle.split(',')[r])*/ + '</span><br />' +
                              '<span style="font-size:10px;">Commodity: '+listVar.commodity.toUpperCase()+'</span><br />'+
                              '<span style="font-size:10px;">Season: '+listVar.season.toUpperCase()+'</span><br />'+
                              '<span style="font-size:10px;">Years: '+ listVar.fromYear + "-"+ listVar.toYear+'</span><br />'+ 
                              '<span style="font-size:10px; color: '+opt.series.area.color+'">Area mean: '+areaavg.toFixed(2)+' '+opt.series.area.unit+'</span><br />'+
                              '<span style="font-size:10px; color: '+opt.series.prod.color+'">Prod mean: '+ prodavg.toFixed(2)+' '+opt.series.prod.unit+'</span><br />'+
                              '<span style="font-size:10px; color: '+opt.series.yield.color+'">Yield mean: '+ yieldavg.toFixed(2)+' '+opt.series.yield.unit+'</span>',
                        align: 'left',
                        verticalAlign: 'bottom',
                        useHTML: true,
                        x: 30,
                        y: 10
					},
					xAxis: [{
						type: 'datetime',
						categories: 'time',
						tickWidth: 0,
						gridLineWidth: 1
					}],
					yAxis: chartConfig.yAxis,
					tooltip: {
                        formatter: function() {
                            var s = '<b>'+ this.x +'</b>';
                            
                            Ext.each(this.points, function(i, point) {
                                s += '<br/><span style="color:'+i.series.color+'">'+ i.series.name +': </span>'+
                                    '<span style="font-size:12px;">'+ i.y+'</span>';
                            });
                            
                            return s;
                        },
                        shared: true,
						crosshairs: true
					},
                    legend: {
                        labelFormatter: function() {
                            if (this.name == 'Area (000 hectares)'){
                                return 'Area (000 ha)';
                            }else{
                                return this.name;
                            }
                            
                        }
                    }            
				}
			});
			charts.push(chart);
		}
		
		return charts; 
	}

}

nrl.chartbuilder.crop.compareRegion = {

	getData: function (json, aggregatedDataOnly,customOpt){
		var chartData = [];

        
		for (var i=0 ; i<json.features.length; i++) {
			var feature = json.features[i];
			var obj = null;
			
			//search already existing entries
			for (var j=0; j<chartData.length; j++){
				if(chartData[j].time == feature.properties.year){
					obj = chartData[j];
				}
			}
			var yr = feature.properties.year;
			var a = feature.properties.area;
			var p = feature.properties.production;
			var yi = feature.properties.yield;
			//create entry if doesn't exists yet
			if(!obj){
				obj = {
                    time: feature.properties.year
				};
				chartData.push(obj);
			}
			
			//create a row entry
			var row = {
				time: yr,
				area: parseFloat(a.toFixed(2)),
				prod: parseFloat(p.toFixed(2)),
				yield: parseFloat(yi.toFixed(2))
			};
            
			
			//obj.rows.push(row);
            obj[feature.properties.region.toLowerCase()] = row[customOpt.variableCompare]

		}
		var newChartData = [];

		var newObj = {
			title: customOpt.variableCompare,
			rows: chartData
		};	
		
		
		
		chartData.reverse();

		
		
		newChartData.push(newObj);
		
		if(aggregatedDataOnly && mean){
			chartData = [mean];
		}else{		
			// Sorts array elements in ascending order numerically.
			function CompareForSort(first, second){
				if (first.time == second.time)
					return 0;
				if (first.time < second.time)
					return -1;
				else
					return 1; 
			}
			
			//sort all year ascending
			for (var i=0; i<newChartData.length; i++){
				//chartData[i].rows.sort(function(a,b){return a.time > b.time});
				newChartData[i].rows.sort(CompareForSort);        
			}
		}
        
		return newChartData;
	},

    
	makeChart: function(data, opt, listVar, aggregatedDataOnly, customOpt){
		
		var charts = [];
		var getAvg = function(arr,type) {
			var sum = 0,len = arr.length;
			for (var i=0;i<len;i++){
				sum += arr[i][type];
			}
			return sum/len;
		};
		
		for (var r=0; r<data.length; r++){
            //calculate avg
            /*var prodavg = getAvg(data[r].rows,'prod');
			var yieldavg = getAvg(data[r].rows,'yield');
			var areaavg = getAvg(data[r].rows,'area');
			var avgs = {
                prod :prodavg,
                yield:yieldavg,
                area:areaavg
            }*/
            //get chart configs (sorting them properly)
            var chartConfig = this.getOrderedChartConfigs(opt,listVar,customOpt.stackedCharts);
			
			var fields = [{
					name: 'time',
					type: 'string'
				},{
					name:'crop',
					type:'string'
			}];
			
			for (var listFields in opt.series){
				fields.push(
					{
						name: listFields,
						type: 'float'
						
					}
				);
			}			
			
            //console.log(chartConfig);
			// Store for random data
			
			var store = new Ext.data.JsonStore({
				data: data[r],
				fields:  fields,
				root: 'rows'
			});

			var chart;
			var text = listVar.commodity.toUpperCase() + ' - ' + opt.name;
			
			//
			// AOI Subtitle customization
			//
			/*var aoiSubtitle = "";
			if(dataTitle == "AGGREGATED DATA"){
				if(aggregatedDataOnly){
					aoiSubtitle += "Pakistan";
				}else{
					aoiSubtitle += listVar.chartTitle;
				}	
			}else{
				aoiSubtitle += chartTitle;
			}*/
			
			//
			// Making Chart Title
			//			
			chart = new Ext.ux.HighChart({
				series: chartConfig.series,				
				
				height: opt.height,
				//width: 900,
				store: store,
				animShift: true,
				xField: 'time',
				chartConfig: {
					chart: {
						zoomType: 'x',
                        spacingBottom: 145                       
					},
                    exporting: {
                        enabled: true,
                        width: 1200,
                        url: customOpt.highChartExportUrl
                    },
					title: {
						//text: (data[r].title.toUpperCase()=="AGGREGATED DATA" ? data[r].title.toUpperCase() + " - " + listVar.commodity.toUpperCase() : listVar.commodity.toUpperCase() +" - "+listVar.chartTitle.split(',')[r]) // + " - " + (listVar.numRegion.length == 1 ? listVar.chartTitle : listVar.chartTitle.split(',')[r])
						text: text
					},
					subtitle: {
                        text: '<span style="font-size:10px;">Source: Pakistan Crop Portal</span><br />'+
                              '<span style="font-size:10px;">Date: '+ listVar.today +'</span><br />'+
                              //'<span style="font-size:10px;">AOI: '+ listVar.chartTitle  + '</span><br />' +
                              '<span style="font-size:10px;">Commodity: '+listVar.commodity.toUpperCase()+'</span><br />'+
                              '<span style="font-size:10px;">Season: '+listVar.season.toUpperCase()+'</span><br />'+
                              '<span style="font-size:10px;">Years: '+ listVar.fromYear + "-"+ listVar.toYear+'</span><br />', //+ 
                              //'<span style="font-size:10px; color: '+opt.series.area.color+'">Area mean: '+areaavg.toFixed(2)+' '+opt.series.area.unit+'</span><br />'+
                              //'<span style="font-size:10px; color: '+opt.series.prod.color+'">Prod mean: '+ prodavg.toFixed(2)+' '+opt.series.prod.unit+'</span><br />'+
                              //'<span style="font-size:10px; color: '+opt.series.yield.color+'">Yield mean: '+ yieldavg.toFixed(2)+' '+opt.series.yield.unit+'</span>',
                        align: 'left',
                        verticalAlign: 'bottom',
                        useHTML: true,
                        x: 30,
                        y: 30
					},
					xAxis: [{
						type: 'datetime',
						categories: 'time',
						tickWidth: 0,
						gridLineWidth: 1
					}],
					yAxis: chartConfig.yAxis,
					plotOptions: chartConfig.plotOptions,
					tooltip: {
                        formatter: function() {
                            var s = '<b>'+ this.x +'</b>';
                            
                            Ext.each(this.points, function(i, point) {
                                s += '<br/><span style="color:'+i.series.color+'">'+ i.series.name +': </span>'+
                                    '<span style="font-size:12px;">'+ i.y+'</span>';
                            });
                            
                            return s;
                        },
                        shared: true,
						crosshairs: true
					},
                    legend: {
						layout: 'vertical',
						align: 'right',
						verticalAlign: 'middle',
						borderWidth: 0,						
                        labelFormatter: function() {
                            if (this.name == 'Area (000 hectares)'){
                                return 'Area (000 ha)';
                            }else{
                                return this.name;
                            }
                            
                        }
                    }            
				}
			});
			charts.push(chart);
		}
		
		return charts; 
	},
    /**
     * private method[getOrderedChartConfigs]
     * get chart configurations properly sorted 
     * to place charts with line style on top and 
     * area styles behind. The fields of the ExtJs store 
     * needs and yAxis configuration needs to be sorted in the same way.
     * ``Object`` opt chartOpts object
     * data. data to use for the chart
     * 
     */
	getOrderedChartConfigs:function(opt,listVar,stackedCharts){
        var ret = {};
		
		ret.series = [];
		
		for (var listFields in opt.series){
			ret.series.push(opt.series[listFields]);
		};
		
		// TODO
        ret.series.sort(function(a,b){
            //area,bar,line,spline are aphabetically ordered as we want
            return a.type < b.type ? -1 : 1;
        });
		
		
        //ret.avgs = [];
        //first element must be time, the other element 
        // must have the same order of the opt and yAxis
        ret.fields=  [{
            name: 'time',
            type: 'string'
        }];
		
		ret.yAxis = [{ // AREA
			title: {
				text: ""
			},                    
			labels: {
				formatter: function () {
					return this.value;
				},
				style: {
					color: "#666666"
				}
			}

		}];
		
		ret.plotOptions = stackedCharts;
		
        return ret;    
    }

}

nrl.chartbuilder.crop.compareCommodity = {
    
    getData: function (json, aggregatedDataOnly,customOpt){
		var chartData = [];
		
		for (var i=0 ; i<json.features.length; i++) {
			var feature = json.features[i];
            //obj represent for the chart related to the selected region
			var obj = null;
			
			//search already existing entries
			for (var j=0; j<chartData.length; j++){
				if(chartData[j].region == feature.properties.region){
					obj = chartData[j];
				}
			}
			
			//create entry if doesn't exists yet
			if(!obj){
				obj = {
					region:feature.properties.region,
					title:feature.properties.region,
					rows: []
				};
				chartData.push(obj);
			}
			
			//create a row entry (element of the chart, time dependent)
			var yr = feature.properties.year;
			var a = feature.properties.area;
			var p = feature.properties.production;
			var yi = feature.properties.yield;
            var crop = feature.properties.crop;
			// utility object to get the proper property.
			var tempFeatureDataMap = {
				time: yr,
				area: parseFloat(a.toFixed(2)),
				prod: parseFloat(p.toFixed(2)),
				yield: parseFloat(yi.toFixed(2))
			};
            var row = null;;
            //search already existing entries
			for (var j=0; j< obj.rows.length; j++){
				if(obj.rows[j].time == feature.properties.year){
					row = obj.rows[j]
				}
			}
            //create row if doesn't exists yet
			if(!row){
				row = {
                    time: feature.properties.year
				};
                obj.rows.push(row);
			}
            row[feature.properties.crop] = tempFeatureDataMap[customOpt.variableCompare];
            
		}
	
		//create mean chart if needed
		var mean;
		
		
		if(aggregatedDataOnly && mean){
			chartData = [mean];
		}else{		
			// Sorts array elements in ascending order numerically.
			function CompareForSort(first, second){
				if (first.time == second.time)
					return 0;
				if (first.time < second.time)
					return -1;
				else
					return 1; 
			}
			
			//sort all year ascending
			for (var i=0; i<chartData.length; i++){
				//chartData[i].rows.sort(function(a,b){return a.time > b.time});
				chartData[i].rows.sort(CompareForSort);        
			}
		}
        
		return chartData;
	},
	
    /**
     * private method[getOrderedChartConfigs]
     * get chart configurations properly sorted 
     * to place charts with line style on top and 
     * area styles behind. The fields of the ExtJs store 
     * needs and yAxis configuration needs to be sorted in the same way.
     * ``Object`` opt chartOpts object
     * data. data to use for the chart
     * 
     */
	getOrderedChartConfigs:function(opt,avgs){
        var ret = {};
        ret.series = [opt.series.prod,
					opt.series.yield,
					opt.series.area		];
        //sort series in an array (lines on top, than bars then areas)
        ret.series.sort(function(a,b){
            //area,bar,line,spline are aphabetically ordered as we want
            return a.type < b.type ? -1 : 1;
        });
        ret.avgs = [];
        //first element must be time, the other element 
        // must have the same order of the opt and yAxis
        ret.fields=  [{
            name: 'time',
            type: 'string'
        }];
        //sort avg objects
        for (var k in opt.series){
            for(var i = 0; i < ret.series.length; i++){
                if(ret.series[i]===opt.series[k]){
                    ret.avgs[i] = avgs[k];
                    
                }
            }
        }
        
        // generate yAxisConfig for each element
        ret.yAxis = [];
        for(var i = 0 ; i < ret.series.length; i++){
            //TODO FIX THIS: THE SORTING MUST BE DIFFERENT
            var yAxisIndex = i;
            //invert last 2 axes.
            switch(ret.series[i].dataIndex){
                case "area": yAxisIndex=0 ; break;
                case "prod": yAxisIndex=1 ; break;
                case "yield": yAxisIndex=2 ; break;
            } 
                
            ret.yAxis[yAxisIndex] = this.generateyAxisConfig(ret.series[i],ret.avgs[i]);
            //console.log("yAxis:"+  yAxisIndex + ",chartOpt:" + i + ret.yAxis[yAxisIndex].title.text + ";" + ret.series[i].name);
            // add opposite option to the yAxis config (except the first)
            if(yAxisIndex>0){
                var yAxis = ret.yAxis[yAxisIndex];
                yAxis.opposite = true;
                //yAxis.rotation = 90;
                
            }
        }
        return ret;

    
    },
/**
     * private method[getOrderedChartConfigs]
     * get chart configurations properly sorted 
     * to place charts with line style on top and 
     * area styles behind. The fields of the ExtJs store 
     * needs and yAxis configuration needs to be sorted in the same way.
     * ``Object`` opt chartOpts object
     * data. data to use for the chart
     * 
     */
	getOrderedChartConfigs:function(opt,listVar,stackedCharts){
        var ret = {};
		
		ret.series = [];
		
		for (var listFields in opt.series){
			ret.series.push(opt.series[listFields]);
		};
		
		// TODO
        ret.series.sort(function(a,b){
            //area,bar,line,spline are aphabetically ordered as we want
            return a.type < b.type ? -1 : 1;
        });
		
		
        //ret.avgs = [];
        //first element must be time, the other element 
        // must have the same order of the opt and yAxis
        ret.fields=  [{
            name: 'time',
            type: 'string'
        }];
		
		ret.yAxis = [{ // AREA
			title: {
				text: ""
			},                    
			labels: {
				formatter: function () {
					return this.value;
				},
				style: {
					color: "#666666"
				}
			}

		}];
		
		ret.plotOptions = stackedCharts;
		
        return ret;    
    },

	makeChart: function(data, opt, listVar, aggregatedDataOnly,customOpt){
		
		var charts = [];
		var getAvg = function(arr,type) {
			var sum = 0,len = arr.length;
			for (var i=0;i<len;i++){
				sum += arr[i][type];
			}
			return sum/len;
		};
		
		for (var r=0; r<data.length; r++){
           
            //get chart configs (sorting them properly)
            var chartConfig = this.getOrderedChartConfigs(opt,listVar,customOpt.stackedCharts);
            //console.log(chartConfig);
			// Store for random data
			var fields = [{
					name: 'time',
					type: 'string'
				}];
			for (var listFields in opt.series){
				fields.push(
					{
						name: listFields,
						type: 'float'
						
					}
				);
			}	
			var store = new Ext.data.JsonStore({
				data: data[r],
				fields:  fields,
				root: 'rows'
			});

			var chart;
			
			//
			// Making Chart Title
			//
			var text = "";
			var dataTitle = data[r].title.toUpperCase();
			var commodity = listVar.commodity.toUpperCase();
            
			var chartTitle = dataTitle;
			
			if(dataTitle){				
				if(dataTitle == "AGGREGATED DATA"){
					if(aggregatedDataOnly){
						text += dataTitle + " (Pakistan) - " + commodity;
					}else{
						text += dataTitle + " - " + commodity;
					}					
				}else{
					text += cropTitles.join(",") + " - " + chartTitle;
				}
			}
			
			//
			// AOI Subtitle customization
			//
			var aoiSubtitle = "";
			if(dataTitle == "AGGREGATED DATA"){
				if(aggregatedDataOnly){
					aoiSubtitle += "Pakistan";
				}else{
					aoiSubtitle += listVar.chartTitle;
				}	
			}else{
				aoiSubtitle += chartTitle;
			}
			
			chart = new Ext.ux.HighChart({
				series: chartConfig.series,
				
				height: opt.height,
				//width: 900,
				store: store,
				animShift: true,
				xField: 'time',
				chartConfig: {
					chart: {
						zoomType: 'x',
                        spacingBottom: 145
					},
                    exporting: {
                        enabled: true,
                        width: 1200,
                        url: customOpt.highChartExportUrl 
                    },
					title: {
						//text: (data[r].title.toUpperCase()=="AGGREGATED DATA" ? data[r].title.toUpperCase() + " - " + listVar.commodity.toUpperCase() : listVar.commodity.toUpperCase() +" - "+listVar.chartTitle.split(',')[r]) // + " - " + (listVar.numRegion.length == 1 ? listVar.chartTitle : listVar.chartTitle.split(',')[r])
						text: text
					},
					subtitle: {
                        text: '<span style="font-size:10px;">Source: Pakistan Crop Portal</span><br />'+
                              '<span style="font-size:10px;">Date: '+ listVar.today +'</span><br />'+
                              '<span style="font-size:10px;">AOI: '+ aoiSubtitle /*(data[r].title.toUpperCase()=="AGGREGATED DATA" ? listVar.chartTitle : listVar.chartTitle.split(',')[r])*/ + '</span><br />' +
                              '<span style="font-size:10px;">Commodity: '+listVar.commodity.toUpperCase()+'</span><br />'+
                              '<span style="font-size:10px;">Season: '+listVar.season.toUpperCase()+'</span><br />'+
                              '<span style="font-size:10px;">Years: '+ listVar.fromYear + "-"+ listVar.toYear+'</span><br />',
                             
                        align: 'left',
                        verticalAlign: 'bottom',
                        useHTML: true,
                        x: 30,
                        y: 10
					},
					xAxis: [{
						type: 'datetime',
						categories: 'time',
						tickWidth: 0,
						gridLineWidth: 1
					}],
					yAxis: chartConfig.yAxis,
					tooltip: {
                        formatter: function() {
                            var s = '<b>'+ this.x +'</b>';
                            
                            Ext.each(this.points, function(i, point) {
                                s += '<br/><span style="color:'+i.series.color+'">'+ i.series.name +': </span>'+
                                    '<span style="font-size:12px;">'+ i.y+'</span>';
                            });
                            
                            return s;
                        },
                        shared: true,
						crosshairs: true
					},
                    legend: {
                        labelFormatter: function() {
                            if (this.name == 'Area (000 hectares)'){
                                return 'Area (000 ha)';
                            }else{
                                return this.name;
                            }
                            
                        }
                    }            
				}
			});
			charts.push(chart);
		}
		
		return charts; 
	}

}