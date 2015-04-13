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



Ext.namespace('nrl.chartbuilder');

/**
 * @author Mirco Bertelli
 * This file contain Chart builders for fertilizers.
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

nrl.chartbuilder.fertilizer = {
    getData: function(json, granType){
        var data = [];
        var regionToDataIndex = {};
        var getChartTitle = function(gran_type, prov, dist){
            switch(gran_type){
                case 'province': return prov; break;
                case 'district': return dist + ' (' + prov + ')'; break;
                case 'pakistan': return 'all'; break;
            }
        }

        // for each feature in json data...
        for (var i=0; i<json.features.length; i++){
            var feature = json.features[i].properties;

            // get an index in data that it's relative (same region) to the
            // current feature i
            var dataIndex = regionToDataIndex[feature[granType]];

            // if there is not entry (in data array) relative to the
            // current feature, it create one and push them in data array
            // and store the data index in regionToDataIndex mapping-structure.
            var chartData;
            if (dataIndex == undefined){
                chartData = {
                    title: getChartTitle(granType, feature.province, feature.district),
                    rows: []
                };
                regionToDataIndex[feature[granType]] = data.push(chartData)-1;
            }else{
                chartData = data[regionToDataIndex[feature[granType]]];
            }
/*
            var rowEntry = {
                nutrient: feature.nutrient,
                tons: feature.tons,
                time: feature.time,
                region: feature[granType]
            }
*/
            var rowEntry = undefined;
            for(var j=0; j<chartData.rows.length; j++){
                if (chartData.rows[j].time == feature.time){
                    rowEntry = chartData.rows[j];
                    break;
                }
            }
            if (!rowEntry){
                rowEntry = {
                    time: feature.time
                };
                chartData.rows.push(rowEntry);
            }
            rowEntry[feature.nutrient] = feature.tons/1000;

//            chartData.rows.push(rowEntry);
        }

        return data;
    },

    getChartConfig: function(opt){
        var ret = {
            fields: [
                {
                    name: 'time',
                    type: 'string'
                }
            ],
            series: [],
            yAxis: []
        };
        for (var nutrient in opt.series){
            ret.series.push(opt.series[nutrient]);
            var yAxisConfig = {
                labels: {
                    formatter: function () {
                        return this.value;
                    },
                    style: {
                        color: opt.series[nutrient].color
                    }
                },
                title: {
                    text: opt.series[nutrient].name + ' ' + opt.series[nutrient].unit,
                    rotation: 270,
                    style: {
                        color: opt.series[nutrient].color,
                        backgroundColor: Ext.isIE ? '#ffffff' : "transparent"
                    }
                }
            };
            ret.yAxis.push(yAxisConfig);
        }

        for(var s=0; s<ret.series.length; s++){
            if (s>0){
                ret.series[s].yAxis = s;
                ret.yAxis[s].opposite = true;
            }
        }

        return ret;
    },

    makeChart: function(data, opt, customOpt){
        var zeroPadding = function(n, padding){
            var nstr = n + '';
            if (nstr.length < padding){
                for(var i=padding-nstr.length; i>0; i--){
                    nstr = '0' + nstr;
                }
            }
            return nstr;
        };

        var now = new Date();
        var dd = zeroPadding(now.getDate(), 2);
        var mm = zeroPadding(now.getMonth()+1, 2); //January is 0!
        var yyyy = now.getFullYear();
        var today = dd + '/' + mm + '/' + yyyy;

        var charts = [];

        for (var r=0; r<data.length; r++){
            var fields = [
                {
                    name: 'time',
                    type: 'string'
                }
            ];
            for(var nutrient in opt.series){
                fields.push({
                    name: nutrient,
                    type: 'float'
                });
            }

            var chartConfig = this.getChartConfig(opt);

            var store = new Ext.data.JsonStore({
                data: data[r],
                fields: fields,
                root: 'rows'
            });

            chart = new Ext.ux.HighChart({
                series: chartConfig.series,
                height: opt.height,
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
                        text: data[r].title
                    },
                    subtitle: {
                        text: '<span style="font-size:10px;">Source: Pakistan Crop Portal</span><br />' +
                              '<span style="font-size:10px;">Date: '+ today +'</span><br />'/*+
                              '<span style="font-size:10px;">AOI: '+ aoiSubtitle + '</span><br />' +
                              '<span style="font-size:10px;">Commodity: '+commoditiesListStr+'</span><br />'+
                              '<span style="font-size:10px;">Season: '+listVar.season.toUpperCase()+'</span><br />'+
                              '<span style="font-size:10px;">Years: '+ listVar.fromYear + "-"+ listVar.toYear+'</span><br />'*/,
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
                                    '<span style="font-size:12px;">'+ i.y.toFixed(2) +'</span>';
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
                },
                info: ''
            });
            charts.push(chart);
        }
        return charts;
    }
}