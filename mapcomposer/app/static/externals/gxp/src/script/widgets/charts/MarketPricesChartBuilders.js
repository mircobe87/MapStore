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
 * This file contain Chart builders for market prices.
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
nrl.chartbuilder.marketprces = {};
nrl.chartbuilder.marketprces.commodity = {
    getData: function(json, granType){
        var data = [];
        var regionToDataIndex = {};
        var getChartTitle = function(gran_type, prov, dist){
            switch(gran_type){
                case 'province': return prov; break;
                case 'district': return dist + ' (' + prov + ')'; break;
                case 'pakistan': return 'Pakistan'; break;
            }
        };

        // for each feature in json data...
        for (var i=0; i<json.features.length; i++){
            var feature = json.features[i].properties;
            if (granType == 'pakistan')
                feature.region = 'pakistan';

            // gets an index form the data that it's relative (same region) to the
            // current feature i
            var dataIndex = regionToDataIndex[feature.region];

            // if there is not entry (in data array) relative to the
            // current feature, it creates one and push it in data array
            // and store the data index in regionToDataIndex mapping-structure.
            var chartData;
            if (dataIndex == undefined){
                chartData = {
                    title: getChartTitle(granType, feature.province, feature.region),
                    rows: []
                };
                regionToDataIndex[feature.region] = data.push(chartData)-1;
            }else{
                chartData = data[regionToDataIndex[feature.region]];
            }

            var rowEntry = undefined;
            var parsedAbsDek = nrl.chartbuilder.util.getDekDate(feature.abs_dek);
            var refStrDate = parsedAbsDek.year + '/' + parsedAbsDek.month + '/' + ((parsedAbsDek.dec - 1)*10 + 1);
            var timeVal = new Date(refStrDate).getTime();

            for(var j=0; j<chartData.rows.length; j++){
                if (chartData.rows[j].time == timeVal){
                    rowEntry = chartData.rows[j];
                    break;
                }
            }
            if (!rowEntry){
                rowEntry = {
                    time: timeVal
                };
                chartData.rows.push(rowEntry);
            }
            rowEntry[feature.crop] = feature.value;
        }


        // it doesn't compute aggregated data if there is only one chart
        if (data.length == 1){
            for(var i=0; i<data.length; i++){
                var dataRows = data[i].rows;
                dataRows.sort(function(r1, r2){
                    return r1.time - r2.time;
                });
            }
            return data;
        }

        // creates a new data entry for the aggregate velues
        var aggregated = {
            title: 'aggregate',
            rows: []
        }
        // this object maps time value on row index for aggregated data
        var timeToRowIndex = {};

        // for each dataEntry in data...
        for(var d=0; d<data.length; d++){
            var dataEntry = data[d];
            // for each rowEntry in rows of the current data entry...
            for(var r=0; r<dataEntry.rows.length; r++){
                var rowEntry = dataEntry.rows[r];
                // search for a row in aggregated that it has the same time value of current row
                var aggregateRowIndex = timeToRowIndex[rowEntry.time];
                var aggregateRowEntry;
                if (aggregateRowIndex == undefined){
                    timeToRowIndex[rowEntry.time] = aggregated.rows.length;
                    aggregated.rows.push({
                        time: rowEntry.time
                    });
                    aggregateRowIndex = timeToRowIndex[rowEntry.time];
                }
                aggregateRowEntry = aggregated.rows[aggregateRowIndex];

                // for each crop, it creates an array of value in order to compute average
                for(var crop in rowEntry){
                    if(crop != 'time'){
                        if (aggregateRowEntry[crop] == undefined)
                            aggregateRowEntry[crop] = [];
                        aggregateRowEntry[crop].push(rowEntry[crop]);
                    }
                }
            }
        }

        // computes averages for each crops
        for(var i=0; i<aggregated.rows.length; i++){
            var row = aggregated.rows[i];
            for(var crop in row){
                if (crop != 'time')
                    row[crop] = row[crop].reduce(function(preAVG, x, preAVGItems){
                        return (preAVG*preAVGItems + x)/(preAVGItems+1);
                    },0);
            }
        }
        data.push(aggregated);
        for(var i=0; i<data.length; i++){
            var dataRows = data[i].rows;
            dataRows.sort(function(r1, r2){
                return r1.time - r2.time;
            });
        }
        return data;
    },

    getChartConfig: function(opt, customOpt){
        var ret = {
            fields: [
                {
                    name: 'time',
                    type: 'string'
                }
            ],
            series: [],
            yAxis: [],
            plotOptions: customOpt.stackedCharts
        };
        /*
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
        */
        for (var crop in opt.series){
            ret.series.push(opt.series[crop]);
        }
        ret.yAxis = [{ // AREA
            title: {
                text: customOpt.stackedCharts.series.stacking == 'percent' ? 'Percentage (%)' : customOpt.uomLabel
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
        return ret;
    },

    makeChart: function(data, opt, customOpt, queryParams){
        var zeroPadding = function(n, padding){
            var nstr = n + '';
            if (nstr.length < padding){
                for(var i=padding-nstr.length; i>0; i--){
                    nstr = '0' + nstr;
                }
            }
            return nstr;
        };
        // this function assums that the aggregate data chart are as last
        // in the chartData array.
        //  queryParams = {
        //      timerange,
        //      from_year,
        //      from_month,
        //      to_year,
        //      to_month
        //  }
        var getChartInfo = function(chartData, chartIndex, queryParams){
            var info = '<span style="font-size:10px;">Source: Pakistan Crop Portal</span><br />';

            // 'today' will contain the current date in dd/mm/yyyy format
            var now = new Date();
            var dd = zeroPadding(now.getDate(), 2);
            var mm = zeroPadding(now.getMonth()+1, 2); //January is 0!
            var yyyy = now.getFullYear();
            var today = dd + '/' + mm + '/' + yyyy;
            info += '<span style="font-size:10px;">Date: '+ today +'</span><br />';

            // build a list of aoi for the current chart.
            var aoi = '';
            var aoiList = [];
            if (chartData[chartIndex].title == 'aggregate'){
                for (var i=0; i<chartIndex; i++){
                    aoiList.push(chartData[i].title);
                }
                aoi = aoiList.join(', ');
            }else{
                aoi = chartData[chartIndex].title;
            }
            info += '<span style="font-size:10px;">Region: '+ aoi + '</span><br />'

            var fromData = nrl.chartbuilder.util.getDekDate(queryParams.start_abs_dec_year);
            var toData   = nrl.chartbuilder.util.getDekDate(queryParams.end_abs_dec_year);
            switch (queryParams.time_opt){
                case 'month': {
                    var fromYear = fromData.year;
                    var toYear   = toData.year;
                    if (toYear-fromYear == 0){
                        info += '<span style="font-size:10px;">Year: '+ fromYear + '</span><br />';
                    }else{
                        info += '<span style="font-size:10px;">Years: '+ fromYear + '-' + toYear + '</span><br />';
                    }
                }break;
                case 'decade_year': {
                    var from = nrl.chartbuilder.util.numberToMonthName(fromData.month) + '(' + fromData.year + ')';
                    var to   = nrl.chartbuilder.util.numberToMonthName(toData.month)   + '(' + toData.year   + ')';

                    info += '<span style="font-size:10px;">Time Range: '+ from + '-' + to + '</span><br />'
                }break;
            }

            return info;
        };

        var getChartTitle = function(chartData, chartIndex){
            var title = 'Market Prices: ';
            var region = (chartData[chartIndex].title == 'aggregate' ? 'REGION' : chartData[chartIndex].title);
            title += region;
            return title;
        };
        
        var getXAxisLabel = function(xVal){
            var mills = parseInt(xVal);
            var date = new Date(mills);
            var lbl = date.dateFormat('M(Y)');

            if (queryParams.time_opt != 'month'){
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

        for (var r=0; r<data.length; r++){

            // defines fields for the store of the chart.
            var fields = [
                {
                    name: 'time',
                    type: 'string'
                }
            ];
            for(var crop in opt.series){
                fields.push({
                    name: crop,
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
                            formatter: function(){
                                return getXAxisLabel(this.value);
                            }
                        }
                    }],
                    yAxis: chartConfig.yAxis,
                    plotOptions: chartConfig.plotOptions,
                    tooltip: {
                        formatter: function() {
                            var xVal = getXAxisLabel(this.x);
                            var s = '<b>'+ xVal +'</b>';

                            Ext.each(this.points, function(i, point) {
                                s += '<br/><span style="color:'+i.series.color+'">'+ i.series.name +': </span>'+
                                    '<span style="font-size:12px;">'+ i.y.toFixed(2) +'</span>';
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
        return charts;
    }
};
nrl.chartbuilder.marketprces.region = {
    getData: function(json, granType){
        var data = [];
        var cropToDataIndex = {};
        //var getChartTitle = function(gran_type, prov, dist){
        //    switch(gran_type){
        //        case 'province': return prov; break;
        //        case 'district': return dist + ' (' + prov + ')'; break;
        //        case 'pakistan': return 'Pakistan'; break;
        //    }
        //};

        // for each feature in json data...
        for (var i=0; i<json.features.length; i++){
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
            if (dataIndex == undefined){
                chartData = {
                    title: nrl.chartbuilder.util.toTitleCase(feature.crop),
                    rows: []
                };
                cropToDataIndex[feature.crop] = data.push(chartData)-1;
            }else{
                chartData = data[cropToDataIndex[feature.crop]];
            }

            var rowEntry = undefined;
            var parsedAbsDek = nrl.chartbuilder.util.getDekDate(feature.abs_dek);
            var refStrDate = parsedAbsDek.year + '/' + parsedAbsDek.month + '/' + ((parsedAbsDek.dec - 1)*10 + 1);
            var timeVal = new Date(refStrDate).getTime();

            for(var j=0; j<chartData.rows.length; j++){
                if (chartData.rows[j].time == timeVal){
                    rowEntry = chartData.rows[j];
                    break;
                }
            }
            if (!rowEntry){
                rowEntry = {
                    time: timeVal
                };
                chartData.rows.push(rowEntry);
            }
            rowEntry[feature.region] = feature.value;
        }

        for(var i=0; i<data.length; i++){
            var dataRows = data[i].rows;
            dataRows.sort(function(r1, r2){
                return r1.time - r2.time;
            });
        }
        return data;

        // it doesn't compute aggregated data if there is only one chart
//        if (data.length == 1){
//            for(var i=0; i<data.length; i++){
//                var dataRows = data[i].rows;
//                dataRows.sort(function(r1, r2){
//                    return r1.time - r2.time;
//                });
//            }
//            return data;
//        }
//
//        // creates a new data entry for the aggregate velues
//        var aggregated = {
//            title: 'aggregate',
//            rows: []
//        }
//        // this object maps time value on row index for aggregated data
//        var timeToRowIndex = {};
//
//        // for each dataEntry in data...
//        for(var d=0; d<data.length; d++){
//            var dataEntry = data[d];
//            // for each rowEntry in rows of the current data entry...
//            for(var r=0; r<dataEntry.rows.length; r++){
//                var rowEntry = dataEntry.rows[r];
//                // search for a row in aggregated that it has the same time value of current row
//                var aggregateRowIndex = timeToRowIndex[rowEntry.time];
//                var aggregateRowEntry;
//                if (aggregateRowIndex == undefined){
//                    timeToRowIndex[rowEntry.time] = aggregated.rows.length;
//                    aggregated.rows.push({
//                        time: rowEntry.time
//                    });
//                    aggregateRowIndex = timeToRowIndex[rowEntry.time];
//                }
//                aggregateRowEntry = aggregated.rows[aggregateRowIndex];
//
//                // for each region, it creates an array of value in order to compute average
//                for(var region in rowEntry){
//                    if(region != 'time'){
//                        if (aggregateRowEntry[region] == undefined)
//                            aggregateRowEntry[region] = [];
//                        aggregateRowEntry[region].push(rowEntry[region]);
//                    }
//                }
//            }
//        }
//
//        // computes averages for each regions
//        for(var i=0; i<aggregated.rows.length; i++){
//            var row = aggregated.rows[i];
//            for(var region in row){
//                if (region != 'time')
//                    row[region] = row[region].reduce(function(preAVG, x, preAVGItems){
//                        return (preAVG*preAVGItems + x)/(preAVGItems+1);
//                    },0);
//            }
//        }
//        data.push(aggregated);
//        for(var i=0; i<data.length; i++){
//            var dataRows = data[i].rows;
//            dataRows.sort(function(r1, r2){
//                return r1.time - r2.time;
//            });
//        }
//        return data;
    },
    getChartConfig: function(opt, customOpt){
        var ret = {
            fields: [
                {
                    name: 'time',
                    type: 'string'
                }
            ],
            series: [],
            yAxis: [],
            plotOptions: customOpt.stackedCharts
        };
        /*
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
        */
        for (var region in opt.series){
            ret.series.push(opt.series[region]);
        }
        ret.yAxis = [{ // AREA
            title: {
                text: customOpt.stackedCharts.series.stacking == 'percent' ? 'Percentage (%)' : customOpt.uomLabel
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
        return ret;
    },
    makeChart: function(data, opt, customOpt, queryParams){
        var zeroPadding = function(n, padding){
            var nstr = n + '';
            if (nstr.length < padding){
                for(var i=padding-nstr.length; i>0; i--){
                    nstr = '0' + nstr;
                }
            }
            return nstr;
        };
        // this function assums that the aggregate data chart are as last
        // in the chartData array.
        //  queryParams = {
        //      timerange,
        //      from_year,
        //      from_month,
        //      to_year,
        //      to_month
        //  }
        var getChartInfo = function(chartData, chartIndex, queryParams){
            var info = '<span style="font-size:10px;">Source: Pakistan Crop Portal</span><br />';

            // 'today' will contain the current date in dd/mm/yyyy format
            var now = new Date();
            var dd = zeroPadding(now.getDate(), 2);
            var mm = zeroPadding(now.getMonth()+1, 2); //January is 0!
            var yyyy = now.getFullYear();
            var today = dd + '/' + mm + '/' + yyyy;
            info += '<span style="font-size:10px;">Date: '+ today +'</span><br />';

            // build a list of crops for the current chart.
            var crops = '';
            var cropsList = [];
            if (chartData[chartIndex].title == 'aggregate'){
                for (var i=0; i<chartIndex; i++){
                    cropsList.push(chartData[i].title);
                }
                crops = cropsList.join(', ');
            }else{
                crops = chartData[chartIndex].title;
            }
            info += '<span style="font-size:10px;">Commodity: '+ crops + '</span><br />'

            var fromData = nrl.chartbuilder.util.getDekDate(queryParams.start_abs_dec_year);
            var toData   = nrl.chartbuilder.util.getDekDate(queryParams.end_abs_dec_year);
            switch (queryParams.time_opt){
                case 'month': {
                    var fromYear = fromData.year;
                    var toYear   = toData.year;
                    if (toYear-fromYear == 0){
                        info += '<span style="font-size:10px;">Year: '+ fromYear + '</span><br />';
                    }else{
                        info += '<span style="font-size:10px;">Years: '+ fromYear + '-' + toYear + '</span><br />';
                    }
                }break;
                case 'decade_year': {
                    var from = nrl.chartbuilder.util.numberToMonthName(fromData.month) + '(' + fromData.year + ')';
                    var to   = nrl.chartbuilder.util.numberToMonthName(toData.month)   + '(' + toData.year   + ')';

                    info += '<span style="font-size:10px;">Time Range: '+ from + '-' + to + '</span><br />'
                }break;
            }

            return info;
        };

        var getChartTitle = function(chartData, chartIndex){
            var title = 'Market Prices: ';
            var region = (chartData[chartIndex].title == 'aggregate' ? 'REGION' : chartData[chartIndex].title);
            title += region;
            return title;
        };

        var getXAxisLabel = function(xVal){
            var mills = parseInt(xVal);
            var date = new Date(mills);
            var lbl = date.dateFormat('M(Y)');

            if (queryParams.time_opt != 'month'){
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

        for (var r=0; r<data.length; r++){

            // defines fields for the store of the chart.
            var fields = [
                {
                    name: 'time',
                    type: 'string'
                }
            ];
            for(var region in opt.series){
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
                            formatter: function(){
                                return getXAxisLabel(this.value);
                            }
                        }
                    }],
                    yAxis: chartConfig.yAxis,
                    plotOptions: chartConfig.plotOptions,
                    tooltip: {
                        formatter: function() {
                            var xVal = getXAxisLabel(this.x);
                            var s = '<b>'+ xVal +'</b>';

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
                info: info
            });
            charts.push(chart);
        }
        return charts;
    }
};