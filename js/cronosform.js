(function($) {
  jQuery.cronosForm = function(element, options){
      
      /*
        Formato válido de respuesta
        {
          status: => Estado de la respuesta post.
          record: => Objecto de respuesta, se sugiere el mismo JSON enviado.
          msg: => Algún mensaje por mostrar.
        }
      */

      var status = {
        novalid: 'novalid',
        valid: 'valid',
        success: 'success',
        error: 'error'
      }

      var action = {
        save: 'save',
        load: 'load',
        delete: 'del'
      }

      var defaults = {
        $form: $(element),
        form: element,
        materializecss: false,
        details: false,
        validate: true,
        inputs: 'input,select,text',
        record_id: 'recid',
        record: undefined,
        record_status: status.novalid,
        record_msg: '',
        record_save: '',
        record_del: '',
        record_load: '',
        button_template: '<div class="row"><div class="input-field col s12 cronosform_button"></div>',
        button_save_show: true,
        button_save_caption: 'Save',
        button_save_template: '<a class="waves-effect waves-light btn cronosform_save" disabled>@caption</a></div>',
        button_del_show: true,
        button_del_caption: 'Delete',
        button_del_template: '<a class="waves-effect waves-teal btn-flat cronosform_del">@caption</a></div>',
        loading_template: '<div class="progress cronosform_progress"><div class="indeterminate"></div></div>',
        onResponse: function(){},
        record_msg_default: {
          novalid: 'Existen campos incompletos que son importante',
          valid: 'Todos los campos requeridos estan completados',
          success_save: 'Se guardo correctamente el registro',
          success_del: 'Se eliminó correctamente el registro',
          success_load: 'Se cargo correctamente los cambios',
          error_status_novalid: 'El JSON devuelto no contiene la estructura requerida'
        },
        parametros: {
          decimalSymbol: '.',
          date_format: 'yyyy-mm-dd'
        }
      }
      
      //Core
      var cronosf = this;
      cronosf.settings = {};

      //Metods
      cronosf.init = function(){
        cronosf.settings = $.extend({}, defaults, options);
        createButton();
      }
      function createButton(){
        if(cronosf.settings.button_save_show || cronosf.settings.button_del_show){
          $(cronosf.settings.form).append(cronosf.settings.button_template);
        }
        //Add Del
        if(cronosf.settings.button_save_show){
          var button_del_show = cronosf.settings.button_del_template.replace(/@caption/g, cronosf.settings.button_del_caption);
          $('.cronosform_button', cronosf.settings.form).append(button_del_show); 
          $('.cronosform_del', cronosf.settings.form).unbind('click').bind('click', button_del_click);
        }
        //Add Save
        if(cronosf.settings.button_save_show){
          var button_save_show = cronosf.settings.button_save_template.replace(/@caption/g, cronosf.settings.button_save_caption);
          $('.cronosform_button', cronosf.settings.form).append(button_save_show); 
          $('.cronosform_save', cronosf.settings.form).unbind('click').bind('click', button_save_click);
        }
      }
      //Core Validation
      var IsDate = function(date){
        //Valid Date InstanceOf
        var validDate = date instanceof Date;
        if(validDate)
          return true;

        try{
          var date2 = new Date(date);
          return isNaN(date.valueOf());
        }catch(e){
          return false;
        }
      }
      var isInt = function(val) {
        var re = /^[-+]?[0-9]+$/;
        return re.test(val);
      }
      var isFloat = function(val) {
        if (typeof val == 'string') val = val.replace(cronosf.settings.parametros.decimalSymbol, '.');
        return (typeof val === 'number' || (typeof val === 'string' && val !== '')) && !isNaN(Number(val));
      }
      var isAlphaNumeric = function(val) {
        var re = /^[a-zA-Z0-9_-]+$/;
        return re.test(val);
      }
      var isEmail = function(val) {
        var email = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        return email.test(val);
      }
      var formatDate = function(date){
        if(IsDate(date)){
          var yyyy = date.getFullYear();
          var mm = addPadding((date.getMonth() + 1), 2);
          var dd = addPadding(date.getDate(), 2);
          var dt = yyyy.toString() + '-' + mm.toString() + '-' + dd.toString();
          return dt;
        }
        return "0000-00-00";
      }
      var addPadding = function (value, length) {
        var negative = ((value < 0) ? "-" : "");
        var zeros = "0";
        for (var i = 2; i < length; i++) {
          zeros += "0";
        }
        return negative + (zeros + Math.abs(value).toString()).slice(-length);
      }
      //Core Record
      var inputLabel = [ "label"];
      var inputSelected = [ "select", "select-one" ];
      var inputDateTime = [ "date", "datetime", "datetime-local", "time", "datepicker" ];
      var inputBoolean = [ "checkbox"];
      var inputNumeric = [ "number", "range", "week", "month"];
      var inputRadio = [ "radio"];
      //Get Record
      cronosf.getRecord = function(){
        var recordNew = cronosf.createRecord();
        $(cronosf.settings.inputs, cronosf.settings.form).each(function(index, data){
            try {

              var $control = $(data);
              
              //Validate if exist data-field
              var controlPropertyObj = $control.attr('data-field');
              if(!controlPropertyObj)
                return;
              var controlProperty = controlPropertyObj.toString();

              //Get Input Type
              var controlType = $control.prop("type");
              
              //Validation Ext for Materialize DatePicker
              var datepicker = 'datepicker';
              if($control.hasClass(datepicker))
                controlType = datepicker;

              //Get Value
              var controlValue = undefined;

              if($.inArray(controlType, inputSelected) > -1){
                controlValue = $control.val();
              }
              else if($.inArray(controlType, inputDateTime) > -1){
                var valueDate;
                if(datepicker == controlType){
                  var $controlPicker = $(data).pickadate('picker');
                  if($controlPicker){
                    valueDate = $controlPicker.get('select', cronosf.settings.parametros.date_format);
                  }
                }
                else{
                  valueDate = $control.val();
                }

                if(cronosf.IsDate(valueDate)){
                  controlValue = new Date(valueDate);
                }
              }
              else if($.inArray(controlType, inputBoolean) > -1){
                controlValue = $control.prop('checked');
              }
              else if($.inArray(controlType, inputNumeric) > -1){
                controlValue = $control.val();
              }
              else if($.inArray(controlType, inputRadio) > -1){
                var controlGroupName = $control.prop('name');
                var $controlGroup = $('input:radio[name=' + controlGroupName + ']:checked', cronosf.settings.form);
                if($controlGroup.length > 0){
                  controlValue = $controlGroup.val();
                }
              }
              else{
                controlValue = $control.val();
              }
              
              //Set Object if is valid
              if(controlValue)
                recordNew[controlProperty] = controlValue;

            } catch (e) {
              recordNew.error.push(data);
            }
        });
        return recordNew;
      }
      //Set Record
      cronosf.setRecord = function (newRecord){
        if(newRecord){
          cronosf.showLoading();
          cronosf.settings.record = newRecord;
          cronosf.loadRecord();
          cronosf.hideLoading();
          cronosf.sendResponse(action.load);
        }else{
          if(cronosf.settings.record_load){
            cronosf.showLoading();
            $.get(cronosf.settings.record_load, { recordJSON: cronosf.record[cronosf.record_id] }, function(data){
              cronosf.matchedRecordJSON(data);
              cronosf.loadRecord();
              cronosf.hideLoading();
              cronosf.sendResponse(action.load);              
            });
          }
          else{
            cronosf.settings.record_status = status.success;
            cronosf.settings.record_msg = cronosf.settings.record_msg_default.success_load;
            cronosf.sendResponse(action.load);
          }
        }
      }
      //Create record default
      cronosf.createRecord = function(){
        var recordNew = new Object();
        recordNew.error = [];
        return recordNew;
      }
      cronosf.saveRecord = function(){
        cronosf.settings.record = cronosf.getRecord();
        cronosf.showLoading();
        if(cronosf.settings.record_save){
          $.post(cronosf.settings.record_save, { recordJSON: cronosf.getRecordJSON() }, function(data){
            cronosf.matchedRecordJSON(data);
            cronosf.hideLoading();
            cronosf.sendResponse(action.save);
          });
        } 
        else{
          cronosf.settings.record_status = status.success;
          cronosf.settings.record_msg = cronosf.settings.record_msg_default.success_save;
          cronosf.hideLoading();
          cronosf.sendResponse(action.save);
        }
      }
      cronosf.delRecord = function(){
        if(cronosf.settings.record_del){
          cronosf.showLoading();
          $.get(cronosf.settings.record_del, { recordJSON: cronosf.record[cronosf.record_id] }, function(data){
            cronosf.matchedRecordJSON(data);
            cronosf.loadRecord();
            cronosf.hideLoading();
            cronosf.sendResponse(action.delete);
          });
        }
        else{
          cronosf.settings.record_status = status.success;
          cronosf.settings.record_msg = cronosf.settings.record_msg_default.success_del;
          cronosf.sendResponse(action.delete);
        }
      }
      cronosf.loadRecord = function(){
        if(cronosf.settings.record){
          $(cronosf.settings.inputs, cronosf.settings.form).each(function(index, data){
            try {

              var $control = $(data);
              
              //Validate if exist data-field
              var controlPropertyObj = $control.attr('data-field');
              if(!controlPropertyObj)
                return;
              var controlProperty = controlPropertyObj.toString();

              //Get Input Type
              var controlType = $control.prop("type");
              
              //Validation Ext for Materialize DatePicker
              var datepicker = 'datepicker';
              if($control.hasClass(datepicker))
                controlType = datepicker;

              //Get Value
              var controlValue = cronosf.settings.record[controlProperty];
              if(!controlValue)
                return;

              if($.inArray(controlType, inputSelected) > -1){
                $control.val(controlValue);
                if(cronosf.settings.materializecss){
                  $(data).material_select();
                }
              }
              else if($.inArray(controlType, inputDateTime) > -1){
                if(IsDate(controlValue)){
                  controlValue = new Date(controlValue);
                  if(datepicker == controlType){
                    var $controlPicker = $(data).pickadate('picker');
                    if($controlPicker){
                      $controlPicker.set('select', controlValue, cronosf.settings.parametros.date_format);
                    }
                  }
                  else{
                    var dt = formatDate(controlValue);
                     $control.val(dt);
                  }
                }
              }
              else if($.inArray(controlType, inputBoolean) > -1){
                $control.removeAttr('checked');
                if(controlValue){
                  $control.prop('checked', true);
                }else{
                  $control.prop('checked', false);
                }
              }
              else if($.inArray(controlType, inputNumeric) > -1){
                $control.val(controlValue);
              }
              else if($.inArray(controlType, inputRadio) > -1){
                var controlGroupName = $control.prop('name');
                var $controlGroup = $('input[type=radio][name=' + controlGroupName + '][value=' + controlValue.toString() + ']', cronosf.settings.form);
                if($controlGroup.length > 0){
                   $controlGroup.prop('checked', true);
                }
              }
              else{
                $control.val(controlValue);
                if(cronosf.settings.materializecss){
                  $('label[for=' + controlProperty + ']', cronosf.settings.form).addClass('active');
                }
              }
              
            } catch (e) {
              if(!cronosf.settings.record.error)
                cronosf.settings.record.error = [];
              cronosf.settings.record.error.push(data);
            }
          });
        }
      }
      cronosf.matchedRecordJSON = function(data){
        var dataJSON = JSON.parse(data);
        if(dataJSON.status){
          if(dataJSON.status == status.success){
            cronosf.settings.record = $.extend({}, cronosf.settings.record, dataJSON.record)
            cronosf.settings.record_status = status.success;
            //If exists msg
            if(dataJSON.msg){
              cronosf.settings.record_msg = dataJSON.msg;
            }
            else{
              cronosf.settings.record_msg = cronosf.settings.msg.success;
            }
          }
          else{
            cronosf.settings.record_status = status.error;
            cronosf.settings.record_msg = dataJSON.msg;  
          }
        }
        else{
          cronosf.settings.record_status = status.error;
          cronosf.settings.record_msg = cronosf.settings.msg.error_status_novalid;
        }
      }
      cronosf.getRecordJSON = function(){
        if(cronosf.settings.record){
          return JSON.stringify(cronosf.settings.record);
        }
        else{
          return {};
        }
      }
      cronosf.sendResponse = function(onAction){
        if(cronosf.settings.onResponse){
          var responseRecord = new Object();
          responseRecord.action = onAction.save;
          responseRecord.record = cronosf.settings.record;
          responseRecord.record_status = cronosf.settings.record_status;
          responseRecord.record_msg = cronosf.settings.record_msg;
          cronosf.settings.onResponse(responseRecord);
        }
      }
      //Core Loading
      cronosf.showLoading = function(){
        $(cronosf.settings.form).append(cronosf.settings.loading_template);
        $('.cronosform_save,.cronosform_del', cronosf.settings.form).attr('disabled', 'disabled');
        if(cronosf.settings.materializecss){
          $('.cronosform_save,.cronosform_del', cronosf.settings.form).addClass('disabled');
        }
      }
      cronosf.hideLoading = function(){
        $('.cronosform_progress').remove();
        $('.cronosform_save,.cronosform_del', cronosf.settings.form).removeAttr('disabled');
        if(cronosf.settings.materializecss){
          $('.cronosform_save,.cronosform_del', cronosf.settings.form).removeClass('disabled');
        }
      }

      //Events
      function button_save_click(){
        var disabled = $('.cronosform_save', cronosf.settings.form).attr('disabled');
        if(!disabled){
          cronosf.saveRecord();
        }
      }
      function button_del_click(){
        var disabled = $('.cronosform_save', cronosf.settings.form).attr('disabled');
        if(!disabled){
          cronosf.delRecord();
        }
      }
      cronosf.init();
  }

  jQuery.fn.cronosForm = function(options) {
    return this.each(function() {
        if (undefined == $(this).data('cronosForm')) {
            var plugin = new $.cronosForm(this, options);
            $(this).data('cronosForm', plugin);
        }
    });
  }
})(jQuery);