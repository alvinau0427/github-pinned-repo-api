$(document).ready(function(){
  $("#input_search").on('focus', function () {
    $(this).parent('label').addClass('active');
  });

  $("#input_search").on('blur', function () {
    if ($(this).val().length == 0) {
      $(this).parent('label').removeClass('active');
    }
  });

  $(document).on('submit','#input_form',function(){
    $("div.spanner").addClass("show");
    $("div.overlay").addClass("show");
  });
});
