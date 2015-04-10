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

Ext.namespace('gxp.widgets.button');

/** api: constructor
 *  .. class:: NrlFertilizerButton(config)
 *
 *    Base class to create chart
 *
 */
gxp.widgets.button.NrlFertilizerButton = Ext.extend(Ext.SplitButton, {

    /** api: xtype = gxp_nrlchart */
    xtype: 'gxp_nrlFertilizerButton',
    iconCls: "gxp-icon-nrl-chart",
    text: 'Generate Chart',
    optionsTitle: "Chart Options",
    tabPanel:'id_mapTab',
    targetTab: 'fertilizers_tab',
    form: null,
    url: null,
    typeName:"nrl:fertilizer_data",
    stackedCharts: {
        series: {
            stacking: null
        }
    },
    /**
     * config [windowManagerOptions]
     * Options for the window manager
     */
    windowManagerOptions: {
        title: "Fertilizers"
    },
    /**
     * private method[createOptionsFildset]
     * ``String`` title the title of the fieldset
     * ``Object`` opts the chartopts object to manage
     * ``String`` prefix the prefix to use in radio names
     */
    createOptionsFildset: function(title,opts,prefix){
        var fieldSet = {
            xtype:'fieldset',
            title:title,
            items:[
                {   //type
                    fieldLabel:"Type",
                    xtype:"radiogroup",
                    columns:2,
                    items: [
                        {
                            boxLabel: '<span class="icon_span ic_chart-line">Line</span>',
                            name: prefix + "_chart_type",
                            inputValue: "line",
                            checked: opts.type == "line"
                        },{
                            boxLabel: '<span class="icon_span ic_chart-spline">Curve</span>',
                            name: prefix + "_chart_type",
                            inputValue: "spline",
                            checked: opts.type == "spline"
                        },{
                            boxLabel: '<span class="icon_span ic_chart-bar">Bar</span>',
                            name: prefix + "_chart_type",
                            inputValue:"column",
                            checked: opts.type == "column"
                        },{
                            boxLabel: '<span class="icon_span ic_chart-area">Area</span>',
                            name: prefix + "_chart_type",
                            inputValue: "area",
                            checked: opts.type == "area"
                        }
                    ],
                    listeners: {
                        change: function(group,checked){
                            if(checked){
                                opts.type = checked.inputValue;
                            }
                        }
                    }
                },{ //color
                    fieldLabel: 'Color',
                    xtype:'colorpickerfield',
                    anchor:'100%',
                    value : opts.color.slice(1),
                    listeners: {
                        select: function(comp,hex,a,b,c,d,e){
                            if(hex){
                                opts.color = '#' + hex;
                                var rgb = comp.menu.picker.hexToRgb(hex);
                                opts.lcolor = "rgb(" +rgb[0]+ "," +rgb[1]+ ","+rgb[2]+ ")";
                            }
                        }
                    }
                }
            ]
        }
        return fieldSet;
    },
    createStackChartsOptions: function(stackedCharts){
        var fieldSet = {
            xtype: 'fieldset',
            title: 'Stack charts of the same type',
            items: [
                {
                    xtype: 'radiogroup',
                    columns:1,
                    fieldLabel: "Stack charts",
                    hideLabel: true,
                    items:[
                        {
                            checked: stackedCharts.series.stacking == null,
                            boxLabel: 'Do not stack',
                            name: 'stackcharts',
                            inputValue: null
                        },{
                            checked: stackedCharts.series.stacking == "normal",
                            boxLabel: 'Stack',
                            name: 'stackcharts',
                            inputValue: 'normal'
                        },{
                            checked: stackedCharts.series.stacking == "percent",
                            boxLabel: 'Stack as percent of the total',
                            labelSeparator: '',
                            name: 'stackcharts',
                            inputValue: 'percent'
                        }
                    ],
                    listeners: {
                        change: function(c,checked){
                            stackedCharts.series.stacking = checked.inputValue;
                        }
                    }
                }
            ]
        };
        return fieldSet;
    },
    menu: {
        items: [
            {
                ref:'../chartoptions',
                iconCls:'ic_wrench',
                text: 'Options',
                handler:function(option){
                    //get mode
                    var mainButton = this.refOwner;
                    var form = mainButton.form.output.getForm();
                    var data = form.getValues();
                    var mode = data.mode;
                    var options = mainButton.chartOpt;
                    var optionsCompare = mode == 'compareRegion' ? mainButton.chartOptCompare : mainButton.optionsCompareCommodities;
                    var stackedCharts = mainButton.stackedCharts;
                    var fieldSetList = [];



                    if (mode === 'composite'){

                        var prodOpt =  mainButton.createOptionsFildset("Production",options.series['prod'],'prod');
                        var areaOpt =  mainButton.createOptionsFildset("Area",options.series['area'],'area');
                        var yieldOpt =  mainButton.createOptionsFildset("Yield",options.series['yield'],'yield');

                        fieldSetList = [prodOpt,areaOpt,yieldOpt];

                    } else if(mode === 'compareRegion'){
                        for (var compareRegion in optionsCompare.series){
                            fieldSetList.push(mainButton.createOptionsFildset(compareRegion,optionsCompare.series[compareRegion],compareRegion));
                        }
                        fieldSetList.push(mainButton.createStackChartsOptions(stackedCharts));
                    }else if(mode === 'compareCommodity'){
                        for (var compareRegion in optionsCompare.series){
                            fieldSetList.push(mainButton.createOptionsFildset(compareRegion,optionsCompare.series[compareRegion],compareRegion));
                        }
                        fieldSetList.push(mainButton.createStackChartsOptions(stackedCharts));
                    }
                    var win = new Ext.Window({
                        iconCls:'ic_wrench',
                        title:   mainButton.optionsTitle,
                        height: 400,
                        width:  350,
                        minWidth:250,
                        minHeight:200,
                        layout:'fit',
                        autoScroll:true,
                        maximizable: true,
                        modal:true,
                        resizable:true,
                        draggable:true,
                        layout:'fit',
                        items:  {
                            ref:'form',
                            xtype:'form',
                            autoScroll:true,
                            frame:'true',
                            layout:'form',
                            items: fieldSetList
                        }


                    });
                    win.show();
                }
            }
        ]
    },
    chartOptCompare:{},
    chartOpt:{
        series:{
            prod:{
                name: 'Production (000 tons)',
                color: '#89A54E',
                lcolor: 'rgb(207,235,148)',
                type: 'line',
                yAxis: 1,
                dataIndex: 'prod',
                unit:'(000 tons)'
            },
            yield:{
                name: 'Yield (kg/ha)',
                dashStyle: 'shortdot',
                type: 'line',
                color: '#4572A7',
                lcolor: 'rgb(139,184,237)',
                yAxis: 2,
                dataIndex: 'yield',
                unit:'(kg/ha)'
            },
            area:{
                name: 'Area (000 hectares)',
                color: '#AA4643',
                lcolor: 'rgb(240,140,137)',
                type: 'line',
                dataIndex: 'area',
                unit:'(000 ha)'
            }
        },
        height: 500
    },
    /**
     * api method[handler]
     * generate the chart
     */
    handler: function(){
        var getViewParams = function(form){
            // gets a list of nutrients selected
            var fertSelected = form.fertilizers.getSelections();
            var fertList = [];
            for(var i=0; i<fertSelected.length; i++)
                fertList.push('\'' + fertSelected[i].data.nutrient + '\'');
            var nutrient_list = fertList.join('\\,');

            // gets the options used in the query for grouping data
            var grouping_opt = (form.timerange.getValue().inputValue == 'monthly' ? 'month' : 'year');

            // gets the min & max year
            var from_year, to_year;
            switch (grouping_opt){
                case 'year': {
                    from_year = form.yearRangeSelector.slider.getValues()[0];
                      to_year = form.yearRangeSelector.slider.getValues()[1];
                }break;
                case 'month': {
                    from_year = form.yearSelector.getValue();
                      to_year = form.yearSelector.getValue();
                }break;
            }

            // gets max & min month
            var from_month_num, to_month_num;
            switch (grouping_opt){
                case 'year': {
                    from_month_num = 1;
                      to_month_num = 12;
                }break;
                case 'month': {
                    from_month_num = form.monthRangeSelector.slider.getValues()[0];
                      to_month_num = form.monthRangeSelector.slider.getValues()[1];
                }break;
            }

            // gets the gran type parameter
            var gran_type = form.aoiFieldSet.gran_type.getValue().inputValue;

            // gets the gran type parameter as string
            var gran_type_str = '\'' + gran_type + '\'';

            // gets the list of selected regions
            var region_list = form.aoiFieldSet.selectedRegions.getValue();

            return 'grouping_opt:'   + grouping_opt   + ';' +
                   'from_year:'      + from_year      + ';' +
                   'to_year:'        + to_year        + ';' +
                   'from_month_num:' + from_month_num + ';' +
                   'to_month_num:'   + to_month_num   + ';' +
                   'nutrient_list:'  + nutrient_list  + ';' +
                   'region_list:'    + region_list    + ';' +
                   'gran_type_str:'  + gran_type_str  + ';' +
                   'gran_type:'      + gran_type      + ';' ;
        }

        var viewparams = getViewParams(this.refOwner);
        Ext.Ajax.request({
            scope:this,
            url : this.url,
            method: 'POST',
            params :{
                service: "WFS",
                version: "1.0.0",
                request: "GetFeature",
                typeName: this.typeName,
                outputFormat: "json",
                propertyName: "time,nutrient,province,district,tons",
                viewparams: viewparams
            },
            success: function(result, request){
                console.log('WIN!');
                console.log(result);
                console.log(request);
            },
            failure: function(result, request){
                console.log('FAIL!');
                console.log(result);
                console.log(request);
            }
        });
    }
});

Ext.reg(gxp.widgets.button.NrlFertilizerButton.prototype.xtype, gxp.widgets.button.NrlFertilizerButton);
