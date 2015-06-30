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
 * This file contain Chart builders for irrigation.
 * they need to implement:
 * getData (json, granType): parse data from features and generate the proper series for their chart
 *     * json 'Object' :  the geojson from the server.
 *     * granType: type of aoi selections
 *         * district
 *         * province
 *         * pakistan
 * makeChart(data, opt, customOpt, queryParams): return a array of HighCharts charts
 */
nrl.chartbuilder.irrigation = {};
nrl.chartbuilder.irrigation.flow = {
    getData: function(json, granType) {
        var data = [];
        var riverToDataIndex = {};

        // for each feature in json data...
        for (var i = 0; i < json.features.length; i++) {
            var feature = json.features[i].properties;

            // gets an index from the data that it's relative (same river) to the
            // current feature i
            var dataIndex = riverToDataIndex[feature.river];

            // if there is not entry (in data array) relative to the
            // current feature, it creates one, push it in data array
            // and store the data index in riverToDataIndex mapping-structure.
            var chartData;
            if (dataIndex == undefined) {
                chartData = {
                    title: feature.river,
                    rows: []
                };
                riverToDataIndex[feature.river] = data.push(chartData) - 1;
            } else {
                chartData = data[riverToDataIndex[feature.river]];
            }

            var rowEntry = undefined;
            var parsedAbsDek = nrl.chartbuilder.util.getDekDate(feature.abs_dec);
            var refStrDate = parsedAbsDek.year + '/' + parsedAbsDek.month + '/' + ((parsedAbsDek.dec - 1) * 10 + 1);
            var timeVal = new Date(refStrDate).getTime();

            for (var j = 0; j < chartData.rows.length; j++) {
                if (chartData.rows[j].time == timeVal) {
                    rowEntry = chartData.rows[j];
                    break;
                }
            }
            if (!rowEntry) {
                rowEntry = {
                    time: timeVal
                };
                chartData.rows.push(rowEntry);
            }
            rowEntry[feature.river] = feature.waterflow;
        }

        for (var i = 0; i < data.length; i++) {
            var dataRows = data[i].rows;
            dataRows.sort(function(r1, r2) {
                return r1.time - r2.time;
            });
        }
        return data;
    },
    getChartConfig: function(riverName, opt, customOpt) {
        var ret = {
            fields: [{
                name: 'time',
                type: 'string'
            }],
            series: [],
            yAxis: [],
            plotOptions: customOpt.stackedCharts
        };
        if (riverName != undefined){
            ret.series.push(opt.series[riverName]);
        }else{
            for(var river in opt.series){
                ret.series.push(opt.series[river]);
            }
        }

        ret.yAxis = [{ // AREA
            title: {
                text: customOpt.stackedCharts.series.stacking == 'percent' ? 'Percentage (%)' : customOpt.uomLabel
            },
            labels: {
                formatter: function() {
                    return this.value;
                },
                style: {
                    color: "#666666"
                }
            }
        }];
        //sort series in an array (lines on top, than bars then areas)
        ret.series.sort(function(a,b){
            //area,bar,line,spline are aphabetically ordered as we want
            return a.type < b.type ? -1 : 1;
        });
        return ret;
    },
    makeChart: function(data, opt, customOpt, queryParams) {
        // this function assums that the data for aggregate chart are as last
        // in the chartData array.
        //  queryParams = {
        //      comparisonby
        //      crop_list
        //      currency
        //      end_abs_dec_year
        //      factor
        //      gran_type
        //      region_list
        //      start_abs_dec_year
        //      time_opt
        //  }
        var getChartInfo = function(chartData, chartIndex, queryParams) {
            var info = '<span style="font-size:10px;">Source: Pakistan Crop Portal</span><br />';

            // 'today' will contain the current date in dd/mm/yyyy format
            var now = new Date();
            var dd = nrl.chartbuilder.util.zeroPadding(now.getDate(), 2);
            var mm = nrl.chartbuilder.util.zeroPadding(now.getMonth() + 1, 2); //January is 0!
            var yyyy = now.getFullYear();
            var today = dd + '/' + mm + '/' + yyyy;
            info += '<span style="font-size:10px;">Date: ' + today + '</span><br />';

            // build a list of river for the current chart.
            var river = '';
            var riverList = [];
            if(chartIndex == undefined || chartIndex < 0){
                for(var i=0; i<chartData.length; i++){
                    riverList.push(chartData[i].title);
                }
                info += '<span style="font-size:10px;">Rivers: ' + riverList.join(', ') + '</span><br />'
            }else{
                river = chartData[chartIndex].title;
                info += '<span style="font-size:10px;">River: ' + river + '</span><br />'
            }

            var fromData = nrl.chartbuilder.util.getDekDate(queryParams.from_abs_dec);
            var toData = nrl.chartbuilder.util.getDekDate(queryParams.to_abs_dec);
            switch (queryParams.time_opt) {
                case 'month':
                    {
                        var fromYear = fromData.year;
                        var toYear = toData.year;
                        if (toYear - fromYear == 0) {
                            info += '<span style="font-size:10px;">Year: ' + fromYear + '</span><br />';
                        } else {
                            info += '<span style="font-size:10px;">Years: ' + fromYear + ' - ' + toYear + '</span><br />';
                        }
                    }
                    break;
                case 'decade_year':
                    {
                        var from = nrl.chartbuilder.util.numberToMonthName(fromData.month) + '(' + fromData.year + ')';
                        var to = nrl.chartbuilder.util.numberToMonthName(toData.month) + '(' + toData.year + ')';

                        info += '<span style="font-size:10px;">Time Range: ' + from + ' - ' + to + '</span><br />'
                    }
                    break;
            }

            return info;
        };

        var getChartTitle = function(chartData, chartIndex) {
            var title = 'Water Flow: ';
            var river = chartData[chartIndex].title;
            title += river;
            return title;
        };

        var getXAxisLabel = function(xVal) {
            var mills = parseInt(xVal);
            var date = new Date(mills);
            var monthStr = date.dateFormat('M');
            var yearStr = date.dateFormat('(Y)');

            var lbl = monthStr;

            if (queryParams.time_opt != 'month') {
                var dayInMonth = parseInt(date.dateFormat('d'));
                var dec;
                if (dayInMonth > 20)
                    dec = 3;
                else if (dayInMonth > 10)
                    dec = 2;
                else
                    dec = 1;

                lbl += '-' + dec;
            }
            lbl += '<br>' + yearStr;
            return lbl;
        };

        var charts = [];

        for (var r = 0; r < data.length; r++) {
            var river = data[r].title;
            // defines fields for the store of the chart.
            var fields = [{
                name: 'time',
                type: 'string'
            }, {
                name: river,
                type: 'float'
            }];

            // retreive chart configuration from plot options
            // chartConfig will contain configuration chart series and yAxis.
            var chartConfig = this.getChartConfig(river, opt, customOpt);

            var info = getChartInfo(data, r, queryParams);
            var chartTitle = getChartTitle(data, r);

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
                        text: chartTitle
                    },
                    subtitle: {
                        text: info,
                        align: 'left',
                        verticalAlign: 'bottom',
                        useHTML: true,
                        x: 30,
                        y: 16
                    },
                    xAxis: [{
                        type: 'datetime',
                        categories: 'time',
                        tickWidth: 0,
                        gridLineWidth: 1,
                        labels: {
                            formatter: function() {
                                return getXAxisLabel(this.value);
                            },
                            rotation: -45,
                            y: 24
                        }
                    }],
                    yAxis: chartConfig.yAxis,
                    plotOptions: chartConfig.plotOptions,
                    tooltip: {
                        formatter: function() {
                            var xVal = getXAxisLabel(this.x);
                            var s = '<b>' + xVal + '</b>';

                            Ext.each(this.points, function(i, point) {
                                s += '<br/><span style="color:' + i.series.color + '">' + i.series.name + ': </span>' +
                                    '<span style="font-size:12px;">' + i.y.toFixed(2) + '</span>';
                            });

                            return s;
                        },
                        shared: true,
                        crosshairs: true
                    }
                },
                info: info
            });
            charts.push(chart);
        }

        if (data.length == 1) return charts;

        var mergedData = this.mergeData(data);
        var fields = [{
            name: 'time',
            type: 'string'
        }];
        for (var river in opt.series){
            fields.push({
                name: river,
                type: 'float'
            });
        }
        var store = new Ext.data.JsonStore({
            data: mergedData,
            fields: fields,
            root: 'rows'
        });
        var mergedChartConfig = this.getChartConfig(undefined, opt, customOpt);
        var info = getChartInfo(data, undefined, queryParams);

        charts.push(new Ext.ux.HighChart({
            series: mergedChartConfig.series,
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
                    text: 'Water Flow: Rivers'
                },
                subtitle: {
                    text: info,
                    align: 'left',
                    verticalAlign: 'bottom',
                    useHTML: true,
                    x: 30,
                    y: 16
                },
                xAxis: [{
                    type: 'datetime',
                    categories: 'time',
                    tickWidth: 0,
                    gridLineWidth: 1,
                    labels: {
                        formatter: function() {
                            return getXAxisLabel(this.value);
                        },
                        rotation: -45,
                        y: 24
                    }
                }],
                yAxis: mergedChartConfig.yAxis,
                plotOptions: mergedChartConfig.plotOptions,
                tooltip: {
                    formatter: function() {
                        var xVal = getXAxisLabel(this.x);
                        var s = '<b>' + xVal + '</b>';

                        Ext.each(this.points, function(i, point) {
                            s += '<br/><span style="color:' + i.series.color + '">' + i.series.name + ': </span>' +
                                '<span style="font-size:12px;">' + i.y.toFixed(2) + '</span>';
                        });

                        return s;
                    },
                    shared: true,
                    crosshairs: true
                }
            },
            info: info
        }));
        return charts;
    },
    mergeData: function(data){
        var ret = {
            rows: [],
            title: 'Rivers'
        };
        var timeMap = {};
        var getIndexByTime = function(t){
            return timeMap[t];
        };
        for(var i=0; i<data.length; i++){
            var serie = data[i].rows;
            for (var j=0; j<serie.length; j++){
                var point = serie[j];
                var x = point.time+'';
                var yName;
                for(var prop in point){
                    yName = prop != 'time' ? prop : undefined;
                }
                var y = point[yName];

                var index = getIndexByTime(x);
                if (!index){
                    ret.rows.push({
                        time: parseInt(x)
                    });
                    timeMap[x] = ret.rows.length-1;
                    index = ret.rows.length-1;
                }
                var entryToUpdate = ret.rows[index];
                entryToUpdate[yName] = y;
            }
        }
        return ret;
    }
};
nrl.chartbuilder.irrigation.supply = {
    getData: function(json, granType) {
        var data = [];
        var cropToDataIndex = {};

        // for each feature in json data...
        for (var i = 0; i < json.features.length; i++) {
            var feature = json.features[i].properties;
            if (granType == 'pakistan')
                feature.region = 'pakistan';

            // gets an index form the data that it's relative (same region) to the
            // current feature i
            var dataIndex = cropToDataIndex[feature.crop];

            // if there is not entry (in data array) relative to the
            // current feature, it creates one and push it in data array
            // and store the data index in cropToDataIndex mapping-structure.
            var chartData;
            if (dataIndex == undefined) {
                chartData = {
                    title: nrl.chartbuilder.util.toTitleCase(feature.crop),
                    rows: []
                };
                cropToDataIndex[feature.crop] = data.push(chartData) - 1;
            } else {
                chartData = data[cropToDataIndex[feature.crop]];
            }

            var rowEntry = undefined;
            var parsedAbsDek = nrl.chartbuilder.util.getDekDate(feature.abs_dec);
            var refStrDate = parsedAbsDek.year + '/' + parsedAbsDek.month + '/' + ((parsedAbsDek.dec - 1) * 10 + 1);
            var timeVal = new Date(refStrDate).getTime();

            for (var j = 0; j < chartData.rows.length; j++) {
                if (chartData.rows[j].time == timeVal) {
                    rowEntry = chartData.rows[j];
                    break;
                }
            }
            if (!rowEntry) {
                rowEntry = {
                    time: timeVal
                };
                chartData.rows.push(rowEntry);
            }
            rowEntry[feature.region] = feature.value;
        }

        for (var i = 0; i < data.length; i++) {
            var dataRows = data[i].rows;
            dataRows.sort(function(r1, r2) {
                return r1.time - r2.time;
            });
        }
        return data;
    },
    getChartConfig: function(opt, customOpt) {
        var ret = {
            fields: [{
                name: 'time',
                type: 'string'
            }],
            series: [],
            yAxis: [],
            plotOptions: customOpt.stackedCharts
        };
        for (var region in opt.series) {
            ret.series.push(opt.series[region]);
        }
        ret.yAxis = [{ // AREA
            title: {
                text: customOpt.stackedCharts.series.stacking == 'percent' ? 'Percentage (%)' : customOpt.uomLabel
            },
            labels: {
                formatter: function() {
                    return this.value;
                },
                style: {
                    color: "#666666"
                }
            }
        }];
        //sort series in an array (lines on top, than bars then areas)
        ret.series.sort(function(a,b){
            //area,bar,line,spline are aphabetically ordered as we want
            return a.type < b.type ? -1 : 1;
        });
        return ret;
    },
    makeChart: function(data, opt, customOpt, queryParams) {
        //  queryParams = {
        //      comparisonby
        //      crop_list
        //      currency
        //      end_abs_dec_year
        //      factor
        //      gran_type
        //      region_list
        //      start_abs_dec_year
        //      time_opt
        //  }
        var getChartInfo = function(chartData, chartIndex, queryParams) {
            var info = '<span style="font-size:10px;">Source: Pakistan Crop Portal</span><br />';

            // 'today' will contain the current date in dd/mm/yyyy format
            var now = new Date();
            var dd = nrl.chartbuilder.util.zeroPadding(now.getDate(), 2);
            var mm = nrl.chartbuilder.util.zeroPadding(now.getMonth() + 1, 2); //January is 0!
            var yyyy = now.getFullYear();
            var today = dd + '/' + mm + '/' + yyyy;
            info += '<span style="font-size:10px;">Date: ' + today + '</span><br />';

            // build a list of crops for the current chart.
            var crops = '';
            var cropsList = [];
            if (chartData[chartIndex].title == 'aggregate') {
                for (var i = 0; i < chartIndex; i++) {
                    cropsList.push(chartData[i].title);
                }
                crops = cropsList.join(', ');
            } else {
                crops = chartData[chartIndex].title;
            }
            info += '<span style="font-size:10px;">Commodity: ' + crops + '</span><br />'

            var fromData = nrl.chartbuilder.util.getDekDate(queryParams.start_abs_dec_year);
            var toData = nrl.chartbuilder.util.getDekDate(queryParams.end_abs_dec_year);
            switch (queryParams.time_opt) {
                case 'month':
                    {
                        var fromYear = fromData.year;
                        var toYear = toData.year;
                        if (toYear - fromYear == 0) {
                            info += '<span style="font-size:10px;">Year: ' + fromYear + '</span><br />';
                        } else {
                            info += '<span style="font-size:10px;">Years: ' + fromYear + ' - ' + toYear + '</span><br />';
                        }
                    }
                    break;
                case 'decade_year':
                    {
                        var from = nrl.chartbuilder.util.numberToMonthName(fromData.month) + '(' + fromData.year + ')';
                        var to = nrl.chartbuilder.util.numberToMonthName(toData.month) + '(' + toData.year + ')';

                        info += '<span style="font-size:10px;">Time Range: ' + from + ' - ' + to + '</span><br />'
                    }
                    break;
            }

            return info;
        };

        var getChartTitle = function(chartData, chartIndex) {
            var title = 'Market Prices: ';
            var region = (chartData[chartIndex].title == 'aggregate' ? 'REGION' : chartData[chartIndex].title);
            title += region;
            return title;
        };

        var getXAxisLabel = function(xVal) {
            var mills = parseInt(xVal);
            var date = new Date(mills);
            var lbl = date.dateFormat('M(Y)');

            if (queryParams.time_opt != 'month') {
                var dayInMonth = parseInt(date.dateFormat('d'));
                var dec;
                if (dayInMonth > 20)
                    dec = 3;
                else if (dayInMonth > 10)
                    dec = 2;
                else
                    dec = 1;

                lbl += ' dec-' + dec;
            }

            return lbl;
        };

        var charts = [];

        for (var r = 0; r < data.length; r++) {

            // defines fields for the store of the chart.
            var fields = [{
                name: 'time',
                type: 'string'
            }];
            for (var region in opt.series) {
                fields.push({
                    name: region,
                    type: 'float'
                });
            }

            // retreive chart configuration from plot options
            // chartConfig will contain configuration chart series and yAxis.
            var chartConfig = this.getChartConfig(opt, customOpt);

            var info = getChartInfo(data, r, queryParams);
            var chartTitle = getChartTitle(data, r);

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
                        text: chartTitle
                    },
                    subtitle: {
                        text: info,
                        align: 'left',
                        verticalAlign: 'bottom',
                        useHTML: true,
                        x: 30,
                        y: 16
                    },
                    xAxis: [{
                        type: 'datetime',
                        categories: 'time',
                        tickWidth: 0,
                        gridLineWidth: 1,
                        labels: {
                            formatter: function() {
                                return getXAxisLabel(this.value);
                            }
                        }
                    }],
                    yAxis: chartConfig.yAxis,
                    plotOptions: chartConfig.plotOptions,
                    tooltip: {
                        formatter: function() {
                            var xVal = getXAxisLabel(this.x);
                            var s = '<b>' + xVal + '</b>';

                            Ext.each(this.points, function(i, point) {
                                s += '<br/><span style="color:' + i.series.color + '">' + i.series.name + ': </span>' +
                                    '<span style="font-size:12px;">' + i.y.toFixed(2) + '</span>';
                            });

                            return s;
                        },
                        shared: true,
                        crosshairs: true
                    },
                    legend: {
                        labelFormatter: function() {
                            if (this.name == 'Area (000 hectares)') {
                                return 'Area (000 ha)';
                            } else {
                                return this.name;
                            }
                        }
                    }
                },
                info: info
            });
            charts.push(chart);
        }
        return charts;
    }
};