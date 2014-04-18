/**
 * An AngularJS directive for showcasing features of your website
 * @version v0.1.7 - 2014-04-18
 * @link https://github.com/DaftMonk/angular-tour
 * @author Tyler Henkel
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */

(function (window, document, undefined) {
  'use strict';
  angular.module('angular-tour', [
    'angular-tour.tpls',
    'angular-tour.tour'
  ]);
  angular.module('angular-tour.tpls', ['tour/tour.tpl.html']);
  angular.module('tour/tour.tpl.html', []).run([
    '$templateCache',
    function ($templateCache) {
      $templateCache.put('tour/tour.tpl.html', '<div class="tour-tip">\n' + '    <span class="tour-arrow tt-{{ ttPlacement }}"></span>\n' + '    <div class="tour-content-wrapper">\n' + '        <p ng-bind-html="ttContent"></p>\n' + '        <a ng-click="setCurrentStep(getCurrentStep() + 1)" ng-bind-html="ttNextLabel" class="small button tour-next-tip"></a>\n' + '        <a ng-click="closeTour()" class="tour-close-tip">\xd7</a>\n' + '    </div>\n' + '</div>\n' + '');
    }
  ]);
  var isUIRouter;
  var navEvent;
  angular.module('angular-tour.tour', []).constant('tourConfig', {
    placement: 'top',
    animation: true,
    nextLabel: 'Next',
    scrollSpeed: 500,
    offset: 28,
    frame: 'html,body'
  }).controller('TourController', [
    '$scope',
    '$injector',
    'orderedList',
    function ($scope, $injector, orderedList) {
      var self = this;
      isUIRouter = $injector.has('$state');
      navEvent = isUIRouter ? '$stateChangeSuccess' : '$locationChangeSuccess';
      var currentState = isUIRouter ? $injector.get('$state').current.name : $injector.get('$location').path();
      self.postTourCallback = angular.noop;
      self.postStepCallback = angular.noop;
      self.currentStep = 0;
      // reset the current step on state change start
      $scope.$on(navEvent, function () {
        self.currentStep = 0;
        self[currentState] = {};
        self[currentState].steps = orderedList();
        $scope.closeTour();
      });
      self.select = function (nextIndex) {
        if (!angular.isNumber(nextIndex))
          return;
        self.unselectAllSteps();
        var step = self[currentState].steps.get(nextIndex);
        if (step) {
          step.ttOpen = true;
        }
        if (self.currentStep !== nextIndex) {
          self.currentStep = nextIndex;
        }
        if (nextIndex >= self[currentState].steps.getCount()) {
          self.postTourCallback();
        }
        self.postStepCallback();
      };
      self.addStep = function (step) {
        if (angular.isNumber(step.index) && !isNaN(step.index)) {
          self[currentState].steps.set(step.index, step);
        } else {
          self[currentState].steps.push(step);
        }
      };
      self.unselectAllSteps = function () {
        self[currentState].steps.forEach(function (step) {
          step.ttOpen = false;
        });
      };
      self.cancelTour = function () {
        self.unselectAllSteps();
        self.postTourCallback();
      };
      $scope.openTour = function () {
        self.select(0);  // always start from 0
      };
      $scope.closeTour = function () {
        self.cancelTour();
      };
    }
  ]).directive('tour', [
    '$parse',
    '$rootScope',
    function ($parse, $rootScope) {
      return {
        controller: 'TourController',
        restrict: 'EA',
        scope: true,
        link: function (scope, element, attrs, ctrl) {
          if (!angular.isDefined(attrs.step)) {
            throw 'The <tour> directive requires a `step` attribute to bind the current step to.';
          }
          var model = $parse(attrs.step);
          scope.$watch(attrs.step, function (newVal) {
            ctrl.currentStep = newVal;
          });
          ctrl.postTourCallback = function () {
            if (angular.isDefined(attrs.postTour)) {
              scope.$parent.$eval(attrs.postTour);
            }
          };
          ctrl.postStepCallback = function () {
            if (angular.isDefined(attrs.postStep)) {
              scope.$parent.$eval(attrs.postStep);
            }
          };
          scope.setCurrentStep = function (val) {
            model.assign(scope.$parent, val);
            ctrl.currentStep = val;
            ctrl.select(ctrl.currentStep);
            $rootScope.$broadcast('$tour:nextStep' + (val - 1));
          };
          scope.getCurrentStep = function () {
            return ctrl.currentStep;
          };
        }
      };
    }
  ]).directive('tourtip', [
    '$window',
    '$compile',
    '$interpolate',
    '$parse',
    '$timeout',
    'scrollTo',
    'tourConfig',
    function ($window, $compile, $interpolate, $parse, $timeout, scrollTo, tourConfig) {
      var startSym = $interpolate.startSymbol(), endSym = $interpolate.endSymbol();
      var template = '<div tour-popup></div>';
      return {
        require: '^tour',
        restrict: 'EA',
        scope: true,
        compile: function (EL, ATTRS) {
          var step = ATTRS.tourtipStep;
          var _global = angular.element($window);
          return {
            pre: function (scope, element, attrs, tourCtrl) {
              attrs.$observe('tourtip', function (val) {
                scope.ttContent = val;
              });
              attrs.$observe('tourtipPlacement', function (val) {
                scope.ttPlacement = val || tourConfig.placement;
              });
              attrs.$observe('tourtipNextLabel', function (val) {
                scope.ttNextLabel = val || tourConfig.nextLabel;
              });
              attrs.$observe('tourtipOffset', function (val) {
                scope.ttOffset = parseInt(val, 10) || tourConfig.offset;
              });
              attrs.$observe('tourtipFrame', function (val) {
                scope.ttFrame = val || tourConfig.frame;
              });
              attrs.$observe('postStep', function (val) {
                scope.ttPostStep = val ? $parse(val) : angular.noop;
              });
              attrs.$observe('tourtipAlign', function (val) {
                scope.ttAlign = 'top bottom'.match(scope.ttPlacement) ? val || 'left' : val || 'top';
              });
              scope.ttOpen = false;
              scope.ttAnimation = tourConfig.animation;
              scope.index = parseInt(step, 10);
              tourCtrl.addStep(scope);
              scope.$on(navEvent, function () {
                tourCtrl.addStep(scope);
              });
            },
            post: function (scope, element, attrs, tourCtrl) {
              var tourtip = $compile(template)(scope);
              var targetElement, frame;
              var scrollHandler = function (e) {
                updatePosition(targetElement, tourtip);
              };
              $timeout(function () {
                if (element.children().eq(0).length > 0)
                  targetElement = element.children().eq(0);
                else
                  targetElement = element;
                frame = targetElement.closest(scope.ttFrame);
                scope.$watch('ttOpen', function (val) {
                  if (val) {
                    show();
                  } else {
                    hide();
                  }
                });
              }, 500);
              var updatePosition = function (targetElement, tourtip) {
                var rects, ttWidth, ttHeight, ttPosition, height, width, arrowOffset;
                rects = targetElement[0].getBoundingClientRect();
                ttWidth = tourtip.width();
                ttHeight = tourtip.height();
                width = targetElement.width();
                height = targetElement.height();
                arrowOffset = tourConfig.offset;
                switch (scope.ttPlacement) {
                case 'right':
                case 'left':
                  if (scope.ttAlign == 'top') {
                    ttPosition = { top: rects.top - (ttHeight > height ? arrowOffset : 0) };
                  } else {
                    ttPosition = { top: rects.top - (ttHeight > height ? ttHeight - arrowOffset * 2 : ttHeight) };
                  }
                  ttPosition.left = scope.ttPlacement == 'right' ? rects.left + width + scope.ttOffset : rects.left - ttWidth - scope.ttOffset;
                  break;
                case 'bottom':
                case 'top':
                  if (scope.ttAlign == 'left') {
                    ttPosition = { left: rects.left - (ttWidth < width ? arrowOffset : 0) };
                  } else {
                    ttPosition = { left: rects.left - (ttWidth < width ? ttWidth - arrowOffset * 2 : ttWidth) };
                  }
                  ttPosition.top = scope.ttPlacement == 'bottom' ? rects.top + height + scope.ttOffset : rects.top - ttHeight - scope.ttOffset;
                  break;
                }
                ttPosition.top += 'px';
                ttPosition.left += 'px';
                tourtip.css(ttPosition);
              };
              function show() {
                if (!scope.ttContent)
                  return;
                if (scope.ttAnimation)
                  tourtip.fadeIn();
                else
                  tourtip.css({ display: 'block' });
                $('body').append(tourtip);
                _global.bind('resize.' + scope.$id, scrollHandler);
                frame.bind('scroll', scrollHandler);
                updatePosition(targetElement, tourtip);
                var scrollConfig = {
                    duration: tourConfig.speed,
                    easing: 'swing'
                  };
                if (scope.ttPlacement == 'top' || scope.ttAlign == 'bottom') {
                  scrollConfig.offsetTop = tourtip.height() + frame.offset().top + 100;  // take tourtip height and the top offset of the frame into account
                } else {
                  scrollConfig.offsetTop = frame.offset().top + 100;
                }
                scrollTo(frame, targetElement, scrollConfig);
              }
              function hide() {
                tourtip.detach();
                _global.unbind('resize.' + scope.$id, scrollHandler);
                frame.unbind('scroll', scrollHandler);
              }
              scope.$on('$destroy', function onDestroyTourtip() {
                _global.unbind('resize.' + scope.$id, scrollHandler);
                frame.unbind('scroll', scrollHandler);
                tourtip.remove();
              });
              scope.$on('$tour:nextStep' + step, function () {
                if (scope.ttPostStep(scope.$parent))
                  scope.ttPostStep(scope.$parent)();
              });
            }
          };
        }
      };
    }
  ]).directive('tourPopup', function () {
    return {
      replace: true,
      templateUrl: 'tour/tour.tpl.html',
      scope: true,
      restrict: 'EA',
      link: function (scope, element, attrs) {
      }
    };
  }).factory('orderedList', function () {
    var OrderedList = function () {
      this.map = {};
      this._array = [];
    };
    OrderedList.prototype.set = function (key, value) {
      if (!angular.isNumber(key))
        return;
      if (key in this.map) {
        this.map[key] = value;
      } else {
        if (key < this._array.length) {
          var insertIndex = key - 1 > 0 ? key - 1 : 0;
          this._array.splice(insertIndex, 0, key);
        } else {
          this._array.push(key);
        }
        this.map[key] = value;
        this._array.sort(function (a, b) {
          return a - b;
        });
      }
    };
    OrderedList.prototype.indexOf = function (value) {
      for (var prop in this.map) {
        if (this.map.hasOwnProperty(prop)) {
          if (this.map[prop] === value)
            return Number(prop);
        }
      }
    };
    OrderedList.prototype.push = function (value) {
      var key = this._array[this._array.length - 1] + 1 || 0;
      this._array.push(key);
      this.map[key] = value;
      this._array.sort(function (a, b) {
        return a - b;
      });
    };
    OrderedList.prototype.remove = function (key) {
      var index = this._array.indexOf(key);
      if (index === -1) {
        throw new Error('key does not exist');
      }
      this._array.splice(index, 1);
      delete this.map[key];
    };
    OrderedList.prototype.get = function (key) {
      return this.map[key];
    };
    OrderedList.prototype.getCount = function () {
      return this._array.length;
    };
    OrderedList.prototype.forEach = function (f) {
      var key, value;
      for (var i = 0; i < this._array.length; i++) {
        key = this._array[i];
        value = this.map[key];
        f(value, key);
      }
    };
    OrderedList.prototype.first = function () {
      var key, value;
      key = this._array[0];
      value = this.map[key];
      return value;
    };
    var orderedListFactory = function () {
      return new OrderedList();
    };
    return orderedListFactory;
  }).factory('scrollTo', function () {
    // code adapted from: http://lions-mark.com/jquery/scrollTo/
    return function (frame, target, options, callback) {
      frame = frame instanceof jQuery ? frame : $(frame);
      if (typeof options == 'function' && arguments.length == 2) {
        callback = options;
        options = target;
      }
      var settings = $.extend({
          scrollTarget: target,
          offsetTop: 50,
          duration: 500,
          easing: 'swing'
        }, options);
      var scrollTarget = typeof settings.scrollTarget == 'number' ? settings.scrollTarget : $(settings.scrollTarget);
      var scrollY = typeof scrollTarget == 'number' ? scrollTarget : scrollTarget.offset().top + frame.scrollTop() - parseInt(settings.offsetTop);
      frame.animate({ scrollTop: scrollY }, parseInt(settings.duration), settings.easing, function () {
        if (typeof callback == 'function') {
          callback.call(this);
        }
      });
    };
  });
}(window, document));